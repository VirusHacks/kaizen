from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
from prophet import Prophet
import json
from datetime import datetime, timedelta
import numpy as np
import logging
import os
from dotenv import load_dotenv

# Load environment variables from .env (if present)
load_dotenv()

# Import WhatsApp helper
try:
    from whatsapp_client import send_whatsapp
except Exception:
    send_whatsapp = None
import io
import skfuzzy as fuzz
from skfuzzy import control as ctrl
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
from twilio.rest import Client
import phonenumbers
from phonenumbers import NumberParseException
from dotenv import load_dotenv
import os
from pathlib import Path

# Configure logging first
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables from .env file
# Try loading from forecast-service directory first, then parent directory
env_path = Path(__file__).parent / '.env'
if not env_path.exists():
    # Try parent directory (Pixro root)
    env_path = Path(__file__).parent.parent / '.env'

if env_path.exists():
    load_dotenv(dotenv_path=env_path)
    logger.info(f"Loaded .env file from: {env_path}")
else:
    # If no .env file found, try loading from current directory
    load_dotenv()
    logger.info("Attempted to load .env file (not found, using system environment variables)")

app = Flask(__name__)
CORS(app)

# Suppress Prophet warnings and plotly import warnings
import warnings
warnings.filterwarnings('ignore')

# Suppress plotly import warning from Prophet
os.environ['PROPHET_DISABLE_PLOTLY'] = '1'

# Suppress specific logger warnings
logging.getLogger('prophet').setLevel(logging.ERROR)
logging.getLogger('prophet.plot').setLevel(logging.ERROR)

# Twilio Configuration
TWILIO_ACCOUNT_SID = os.environ.get('TWILIO_ACCOUNT_SID')
TWILIO_AUTH_TOKEN = os.environ.get('TWILIO_AUTH_TOKEN')
TWILIO_WHATSAPP_FROM = os.environ.get('TWILIO_WHATSAPP_FROM')  # Format: whatsapp:+14155238886

# Log environment variable status (without exposing sensitive data)
logger.info(f"Twilio configuration check:")
logger.info(f"  TWILIO_ACCOUNT_SID: {'Set' if TWILIO_ACCOUNT_SID else 'Not set'}")
logger.info(f"  TWILIO_AUTH_TOKEN: {'Set' if TWILIO_AUTH_TOKEN else 'Not set'}")
logger.info(f"  TWILIO_WHATSAPP_FROM: {TWILIO_WHATSAPP_FROM if TWILIO_WHATSAPP_FROM else 'Not set'}")

# Initialize Twilio client if credentials are available
twilio_client = None
if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
    try:
        twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        logger.info("Twilio client initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize Twilio client: {str(e)}")
        twilio_client = None
else:
    logger.warning("Twilio credentials not found. WhatsApp sending will be disabled. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_FROM environment variables in .env file.")

def format_phone_number(phone, default_region='US'):
    """
    Format phone number to E.164 format required by Twilio
    Returns formatted number or None if invalid
    """
    if not phone:
        return None
    
    # Remove any whitespace and special characters except +
    phone = str(phone).strip().replace(' ', '').replace('-', '').replace('(', '').replace(')', '').replace('.', '')
    
    # If it already starts with +, assume it's in international format
    if phone.startswith('+'):
        try:
            parsed = phonenumbers.parse(phone, None)
            if phonenumbers.is_valid_number(parsed):
                return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
        except NumberParseException:
            pass
    
    # Try parsing with default region first
    try:
        parsed = phonenumbers.parse(phone, default_region)
        if phonenumbers.is_valid_number(parsed):
            return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
    except NumberParseException:
        pass
    
    # If it's a 10-digit number, try common country codes
    if len(phone) == 10 and phone.isdigit():
        # Common country codes to try (in order of likelihood)
        country_codes = [
            ('IN', '+91'),  # India (10 digits starting with 6-9)
            ('US', '+1'),   # United States/Canada
            ('GB', '+44'),  # United Kingdom
            ('AU', '+61'),  # Australia
            ('DE', '+49'),  # Germany
        ]
        
        # Check if it looks like an Indian number (starts with 6, 7, 8, or 9)
        if phone[0] in ['6', '7', '8', '9']:
            # Try India first for numbers starting with 6-9
            try:
                parsed = phonenumbers.parse(f"+91{phone}", None)
                if phonenumbers.is_valid_number(parsed):
                    return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
            except NumberParseException:
                pass
        
        # Try other common country codes
        for region, code in country_codes:
            try:
                parsed = phonenumbers.parse(f"{code}{phone}", None)
                if phonenumbers.is_valid_number(parsed):
                    return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
            except NumberParseException:
                continue
    
    # Try parsing with 'IN' region (India) as fallback for 10-digit numbers
    if len(phone) == 10 and phone.isdigit():
        try:
            parsed = phonenumbers.parse(phone, 'IN')
            if phonenumbers.is_valid_number(parsed):
                return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
        except NumberParseException:
            pass
    
    # Try other common regions
    for region in ['IN', 'GB', 'AU', 'CA', 'DE', 'FR', 'IT', 'ES', 'BR', 'MX']:
        try:
            parsed = phonenumbers.parse(phone, region)
            if phonenumbers.is_valid_number(parsed):
                return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
        except NumberParseException:
            continue
    
    return None

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "service": "forecast-service",
        "version": "1.0.0"
    })

@app.route('/forecast', methods=['POST'])
def forecast():
    """Generate forecast using Prophet model"""
    try:
        data = request.json
        if not data:
            return jsonify({
                "error": "No data provided",
                "historical": [],
                "forecast": []
            }), 400
            
        monthly_data = data.get('monthlyData', [])
        periods = int(data.get('periods', 6))
        forecast_type = data.get('type', 'revenue')  # revenue, aov, orders
        
        logger.info(f"\n{'='*60}")
        logger.info(f"🐍 PYTHON FORECAST SERVICE - REQUEST RECEIVED")
        logger.info(f"{'='*60}")
        logger.info(f"Forecast Type: {forecast_type}")
        logger.info(f"Periods: {periods}")
        logger.info(f"Data Points: {len(monthly_data)}")
        logger.info(f"{'='*60}\n")
        
        if len(monthly_data) < 3:
            logger.warning(f"Insufficient data: {len(monthly_data)} months provided, need at least 3")
            return jsonify({
                "error": "Insufficient data. Need at least 3 months of historical data.",
                "historical": monthly_data,
                "forecast": []
            }), 400
        
        # Convert to DataFrame
        df = pd.DataFrame(monthly_data)
        df['ds'] = pd.to_datetime(df['month'] + '-01')
        df = df.sort_values('ds')
        
        # Prepare Prophet data
        prophet_df = pd.DataFrame({
            'ds': df['ds'],
            'y': df[forecast_type]
        })
        
        # Initialize and fit Prophet model
        model = Prophet(
            yearly_seasonality=True,
            weekly_seasonality=False,
            daily_seasonality=False,
            seasonality_mode='multiplicative',
            changepoint_prior_scale=0.05
        )
        
        model.fit(prophet_df)
        
        # Create future dataframe
        future = model.make_future_dataframe(periods=periods, freq='MS')  # MS = Month Start
        
        # Generate forecast
        forecast = model.predict(future)
        
        # Split into historical and forecast
        historical_count = len(prophet_df)
        historical_forecast = forecast.iloc[:historical_count]
        future_forecast = forecast.iloc[historical_count:]
        
        # Format historical data
        historical = []
        for idx, row in df.iterrows():
            hist_forecast = historical_forecast[historical_forecast['ds'] == row['ds']]
            if not hist_forecast.empty:
                historical.append({
                    'month': row['month'],
                    'value': float(row[forecast_type]),
                    'type': 'historical',
                    'trend': float(hist_forecast.iloc[0]['trend']),
                    'yhat_lower': float(hist_forecast.iloc[0]['yhat_lower']),
                    'yhat_upper': float(hist_forecast.iloc[0]['yhat_upper'])
                })
        
        # Format forecast data
        forecast_data = []
        for _, row in future_forecast.iterrows():
            month_str = row['ds'].strftime('%Y-%m')
            forecast_data.append({
                'month': month_str,
                'value': float(row['yhat']),
                'type': 'forecast',
                'trend': float(row['trend']),
                'yhat_lower': float(row['yhat_lower']),
                'yhat_upper': float(row['yhat_upper'])
            })
        
        # Calculate model metrics
        actuals = df[forecast_type].values
        predictions = historical_forecast['yhat'].values
        
        mape = np.mean(np.abs((actuals - predictions) / actuals)) * 100 if np.any(actuals != 0) else 0
        mae = np.mean(np.abs(actuals - predictions))
        
        logger.info(f"\n{'='*60}")
        logger.info(f"✅ FORECAST GENERATION SUCCESSFUL")
        logger.info(f"{'='*60}")
        logger.info(f"Forecast periods generated: {len(forecast_data)}")
        logger.info(f"Model metrics - MAPE: {mape:.2f}%, MAE: {mae:.2f}")
        logger.info(f"{'='*60}\n")
        
        return jsonify({
            'historical': historical,
            'forecast': forecast_data,
            'metrics': {
                'mape': float(mape),
                'mae': float(mae),
                'rmse': float(np.sqrt(np.mean((actuals - predictions) ** 2)))
            },
            'components': {
                'trend': 'multiplicative',
                'seasonality': 'yearly'
            }
        })
        
    except Exception as e:
        logger.error(f"Forecast error: {str(e)}", exc_info=True)
        return jsonify({
            "error": str(e),
            "historical": [],
            "forecast": []
        }), 500


@app.route('/send-whatsapp', methods=['POST'])
def send_whatsapp_route():
    """API endpoint to send WhatsApp messages via Twilio.

    Expected JSON body:
    {
      "users": ["+919876543210", "whatsapp:+1..."],
      "message": "Hello",
      "from": "whatsapp:+1415..." (optional)
    }
    """
    try:
        if send_whatsapp is None:
            return jsonify({"error": "WhatsApp support not available (twilio not installed)"}), 500

        data = request.json or {}
        users = data.get('users') or data.get('to') or []
        message = data.get('message') or data.get('body')
        from_number = data.get('from')

        if not isinstance(users, list) or not users:
            return jsonify({"error": "'users' must be a non-empty list of phone numbers"}), 400
        if not message:
            return jsonify({"error": "'message' is required"}), 400

        results = send_whatsapp(users, message, from_number)
        return jsonify(results)
    except Exception as e:
        logger.error('Error in send_whatsapp_route: %s', str(e), exc_info=True)
        return jsonify({"error": str(e)}), 500

# --- Customer Segmentation Service (Fuzzy Logic + K-means) ---

# Global variables for segmentation models (will be initialized on first use)
segmentation_scaler = None
segmentation_kmeans = None
segmentation_initialized = False

# Define the universe of discourse for numerical attributes
total_spent_universe = np.arange(0, 5001, 1)
intent_score_universe = np.arange(0, 1.01, 0.01)
touchpoints_count_universe = np.arange(0, 21, 1)
recency_universe = np.arange(0, 801, 1)
promotional_segment_universe = np.arange(0, 11, 1)

# Input Antecedents
total_spent_ctrl = ctrl.Antecedent(total_spent_universe, 'total_spent')
intent_score_ctrl = ctrl.Antecedent(intent_score_universe, 'intent_score')
touchpoints_count_ctrl = ctrl.Antecedent(touchpoints_count_universe, 'touchpoints_count')
recency_ctrl = ctrl.Antecedent(recency_universe, 'recency')

# Output Consequent
promotional_segment_ctrl = ctrl.Consequent(promotional_segment_universe, 'promotional_segment')

# Membership functions for total_spent
total_spent_ctrl['low'] = fuzz.trimf(total_spent_universe, [0, 0, 1500])
total_spent_ctrl['medium'] = fuzz.trimf(total_spent_universe, [1000, 2500, 4000])
total_spent_ctrl['high'] = fuzz.trimf(total_spent_universe, [3500, 5000, 5000])

# Membership functions for intent_score
intent_score_ctrl['weak'] = fuzz.trimf(intent_score_universe, [0, 0, 0.5])
intent_score_ctrl['moderate'] = fuzz.trimf(intent_score_universe, [0.3, 0.6, 0.9])
intent_score_ctrl['strong'] = fuzz.trimf(intent_score_universe, [0.7, 1, 1])

# Membership functions for touchpoints_count
touchpoints_count_ctrl['low'] = fuzz.trimf(touchpoints_count_universe, [0, 0, 7])
touchpoints_count_ctrl['medium'] = fuzz.trimf(touchpoints_count_universe, [5, 12, 18])
touchpoints_count_ctrl['high'] = fuzz.trimf(touchpoints_count_universe, [15, 20, 20])

# Membership functions for recency
recency_ctrl['recent'] = fuzz.trimf(recency_universe, [0, 0, 200])
recency_ctrl['moderate'] = fuzz.trimf(recency_universe, [150, 400, 650])
recency_ctrl['distant'] = fuzz.trimf(recency_universe, [600, recency_universe.max(), recency_universe.max()])

# Output membership functions for promotional_segment
promotional_segment_ctrl['new_customer_nurture'] = fuzz.trimf(promotional_segment_universe, [0, 0, 4])
promotional_segment_ctrl['high_value_engagement'] = fuzz.trimf(promotional_segment_universe, [3, 6, 9])
promotional_segment_ctrl['re_engagement'] = fuzz.trimf(promotional_segment_universe, [7, 10, 10])

# Fuzzy Rules
rule1 = ctrl.Rule(total_spent_ctrl['high'] & intent_score_ctrl['strong'] & recency_ctrl['recent'],
                  promotional_segment_ctrl['high_value_engagement'])
rule2 = ctrl.Rule(total_spent_ctrl['low'] & recency_ctrl['distant'],
                  promotional_segment_ctrl['re_engagement'])
rule3 = ctrl.Rule(total_spent_ctrl['low'] & intent_score_ctrl['weak'] & recency_ctrl['recent'] & touchpoints_count_ctrl['low'],
                  promotional_segment_ctrl['new_customer_nurture'])
rule4 = ctrl.Rule(total_spent_ctrl['medium'] & intent_score_ctrl['moderate'] & recency_ctrl['moderate'],
                  promotional_segment_ctrl['high_value_engagement'])
rule5 = ctrl.Rule(recency_ctrl['distant'] & touchpoints_count_ctrl['low'],
                  promotional_segment_ctrl['re_engagement'])
rule6 = ctrl.Rule(intent_score_ctrl['strong'] & touchpoints_count_ctrl['high'],
                  promotional_segment_ctrl['high_value_engagement'])

# Control System and Simulation
promotional_segmenting_ctrl = ctrl.ControlSystem([
    rule1, rule2, rule3, rule4, rule5, rule6
])
promotional_segmenting_sim = ctrl.ControlSystemSimulation(promotional_segmenting_ctrl)

# Bins and labels for promotional segment category mapping
promotional_bins = [0, 4.5, 7.5, 10]
promotional_labels = ['New Customer Nurture', 'High Value Engagement', 'Re-engagement']

# Features for clustering
clustering_features = ['total_spent', 'intent_score', 'touchpoints_count', 'recency']

def initialize_segmentation_models(df_training):
    """Initialize scaler and K-means models with training data"""
    global segmentation_scaler, segmentation_kmeans, segmentation_initialized
    
    try:
        # Prepare training data
        df_training = df_training.copy()
        df_training['last_purchase_date'] = pd.to_datetime(df_training['last_purchase_date'], errors='coerce')
        df_training['total_spent'] = df_training['total_spent'].fillna(0)
        
        # Calculate recency
        initial_reference_date = pd.Timestamp.now()
        df_training['recency'] = (initial_reference_date - df_training['last_purchase_date']).dt.days
        initial_max_recency = df_training['recency'].max()
        if pd.isna(initial_max_recency):
            initial_max_recency = 1000
        df_training['recency'] = df_training['recency'].fillna(initial_max_recency + 30).astype(int)
        
        # Ensure all required features exist
        for feature in clustering_features:
            if feature not in df_training.columns:
                if feature == 'intent_score':
                    df_training[feature] = 0.5  # Default intent score
                elif feature == 'touchpoints_count':
                    df_training[feature] = 0  # Default touchpoints
                else:
                    df_training[feature] = 0
        
        df_for_training = df_training[clustering_features].copy()
        
        # Initialize and train StandardScaler
        segmentation_scaler = StandardScaler()
        segmentation_scaler.fit(df_for_training)
        
        # Initialize and train KMeans
        segmentation_kmeans = KMeans(n_clusters=4, random_state=42, n_init='auto')
        segmentation_kmeans.fit(segmentation_scaler.transform(df_for_training))
        
        segmentation_initialized = True
        logger.info("Segmentation models initialized successfully")
        return True
    except Exception as e:
        logger.error(f"Error initializing segmentation models: {str(e)}", exc_info=True)
        return False

def prepare_customer_data(df_input):
    """Preprocess customer data for segmentation"""
    df_processed = df_input.copy()
    
    # Convert 'last_purchase_date' to datetime
    df_processed['last_purchase_date'] = pd.to_datetime(df_processed['last_purchase_date'], errors='coerce')
    
    # Fill NaN 'total_spent' with 0
    df_processed['total_spent'] = df_processed['total_spent'].fillna(0)
    
    # Calculate 'recency' based on current date
    current_date = pd.Timestamp.now()
    df_processed['recency'] = (current_date - df_processed['last_purchase_date']).dt.days
    
    # For customers with no purchase date (NaN recency), assign a value higher than any existing recency
    max_recency_val = df_processed['recency'].max()
    if pd.isna(max_recency_val):
        max_recency_val = 1000
    df_processed['recency'] = df_processed['recency'].fillna(max_recency_val + 30).astype(int)
    
    # Ensure all required features exist
    for feature in clustering_features:
        if feature not in df_processed.columns:
            if feature == 'intent_score':
                df_processed[feature] = 0.5  # Default intent score
            elif feature == 'touchpoints_count':
                df_processed[feature] = 0  # Default touchpoints
            else:
                df_processed[feature] = 0
    
    # Select features for scaling and clustering
    features_to_scale = df_processed[clustering_features]
    df_scaled_features = segmentation_scaler.transform(features_to_scale)
    
    return df_processed, df_scaled_features

def apply_fuzzy_segmentation(row_data):
    """Apply fuzzy logic segmentation to a single row"""
    promotional_segment_score = np.nan
    promotional_segment_category = 'Unknown'
    
    try:
        # Set input values for the fuzzy inference system
        promotional_segmenting_sim.input['total_spent'] = float(row_data['total_spent'])
        promotional_segmenting_sim.input['intent_score'] = float(row_data['intent_score'])
        promotional_segmenting_sim.input['touchpoints_count'] = float(row_data['touchpoints_count'])
        promotional_segmenting_sim.input['recency'] = float(row_data['recency'])
        
        # Compute the fuzzy output
        promotional_segmenting_sim.compute()
        
        # Defuzzify the output to get a crisp promotional segment score
        if 'promotional_segment' in promotional_segmenting_sim.output:
            promotional_segment_score = promotional_segmenting_sim.output['promotional_segment']
            
            # Map score to category using predefined bins and labels
            if not np.isnan(promotional_segment_score):
                if promotional_segment_score >= promotional_bins[0] and promotional_segment_score < promotional_bins[1]:
                    promotional_segment_category = promotional_labels[0]
                elif promotional_segment_score >= promotional_bins[1] and promotional_segment_score < promotional_bins[2]:
                    promotional_segment_category = promotional_labels[1]
                elif promotional_segment_score >= promotional_bins[2] and promotional_segment_score <= promotional_bins[3]:
                    promotional_segment_category = promotional_labels[2]
    except (ValueError, KeyError) as e:
        logger.warning(f"Fuzzy segmentation error for row: {str(e)}")
        pass
    
    return promotional_segment_score, promotional_segment_category

@app.route('/segmentation', methods=['POST'])
def segment_customers():
    """Customer segmentation endpoint using fuzzy logic and K-means"""
    global segmentation_initialized
    
    try:
        # Check if file is uploaded
        if 'file' not in request.files:
            return jsonify({"error": "No file part in the request"}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No selected file"}), 400
        
        # Read CSV file into DataFrame
        df_input = pd.read_csv(io.StringIO(file.stream.read().decode("utf-8")))
        
        logger.info(f"Segmentation request: {len(df_input)} rows received")
        
        # Initialize models with the uploaded data if not already initialized
        if not segmentation_initialized:
            logger.info("Initializing segmentation models with uploaded data...")
            if not initialize_segmentation_models(df_input):
                return jsonify({"error": "Failed to initialize segmentation models"}), 500
        
        # Preprocess data and get scaled features
        df_processed, df_scaled_features = prepare_customer_data(df_input)
        
        # Initialize columns for results
        df_processed['promotional_segment_score'] = np.nan
        df_processed['promotional_segment_category'] = 'Unknown'
        df_processed['cluster_label'] = -1
        
        # Apply fuzzy segmentation
        for index, row in df_processed.iterrows():
            score, category = apply_fuzzy_segmentation(row)
            df_processed.at[index, 'promotional_segment_score'] = score
            df_processed.at[index, 'promotional_segment_category'] = category
        
        # K-means clustering labels
        df_processed['cluster_label'] = segmentation_kmeans.predict(df_scaled_features)
        
        # Convert DataFrame to JSON and return
        result = df_processed.to_dict(orient='records')
        
        # Convert numpy types to native Python types for JSON serialization
        for record in result:
            for key, value in record.items():
                if isinstance(value, (np.integer, np.int64)):
                    record[key] = int(value)
                elif isinstance(value, (np.floating, np.float64)):
                    record[key] = float(value) if not np.isnan(value) else None
                elif pd.isna(value):
                    record[key] = None
        
        logger.info(f"Segmentation successful: {len(result)} customers segmented")
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Segmentation error: {str(e)}", exc_info=True)
        return jsonify({"error": f"An internal error occurred: {str(e)}"}), 500

@app.route('/segmentation/initialize', methods=['POST'])
def initialize_segmentation():
    """Initialize segmentation models with training data"""
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file part in the request"}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No selected file"}), 400
        
        # Read CSV file into DataFrame
        df_training = pd.read_csv(io.StringIO(file.stream.read().decode("utf-8")))
        
        logger.info(f"Initialization request: {len(df_training)} rows received")
        
        if initialize_segmentation_models(df_training):
            return jsonify({
                "status": "success",
                "message": "Segmentation models initialized successfully",
                "rows_trained": len(df_training)
            })
        else:
            return jsonify({"error": "Failed to initialize models"}), 500
            
    except Exception as e:
        logger.error(f"Initialization error: {str(e)}", exc_info=True)
        return jsonify({"error": f"An internal error occurred: {str(e)}"}), 500

@app.route('/whatsapp/send', methods=['POST'])
def send_whatsapp():
    """Send WhatsApp messages to customers using Twilio"""
    try:
        # Log request details
        logger.info(f"WhatsApp send endpoint called. Method: {request.method}, Content-Type: {request.content_type}")
        logger.info(f"Request headers: {dict(request.headers)}")
        
        # Handle JSON data - try multiple ways
        data = None
        if request.is_json:
            data = request.get_json()
        else:
            # Try to parse as JSON anyway
            try:
                if request.data:
                    data = json.loads(request.data.decode('utf-8'))
            except Exception as e:
                logger.error(f"Failed to parse request data as JSON: {str(e)}")
        
        if not data:
            logger.error("No data provided in request")
            return jsonify({"error": "No data provided"}), 400
        
        logger.info(f"Received data: {json.dumps(data, indent=2)}")
        
        recipients = data.get('recipients', [])  # Array of {phone: string, message: string, customerName?: string}
        
        if not recipients or len(recipients) == 0:
            logger.error("No recipients provided in request")
            return jsonify({"error": "No recipients provided"}), 400
        
        # Check if Twilio is configured
        logger.info(f"Twilio client status: {'Initialized' if twilio_client else 'Not initialized'}")
        logger.info(f"TWILIO_WHATSAPP_FROM: {TWILIO_WHATSAPP_FROM}")
        
        if not twilio_client:
            error_msg = "Twilio is not configured. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_FROM environment variables."
            logger.error(error_msg)
            return jsonify({
                "error": error_msg,
                "success": False
            }), 500
        
        if not TWILIO_WHATSAPP_FROM:
            error_msg = "TWILIO_WHATSAPP_FROM is not configured. Please set the WhatsApp sender number in format: whatsapp:+14155238886"
            logger.error(error_msg)
            return jsonify({
                "error": error_msg,
                "success": False
            }), 500
        
        logger.info(f"WhatsApp send request: {len(recipients)} recipients")
        
        results = []
        for idx, recipient in enumerate(recipients):
            logger.info(f"Processing recipient {idx + 1}/{len(recipients)}: {recipient}")
            phone = recipient.get('phone')
            message = recipient.get('message')
            customer_name = recipient.get('customerName', 'Customer')
            
            if not phone or not message:
                error_msg = "Missing phone or message"
                logger.warning(f"Recipient {idx + 1} skipped: {error_msg}")
                results.append({
                    "phone": phone,
                    "customerName": customer_name,
                    "success": False,
                    "error": error_msg
                })
                continue
            
            try:
                # Format phone number to E.164 format
                logger.info(f"Formatting phone number: {phone}")
                formatted_phone = format_phone_number(phone)
                
                if not formatted_phone:
                    error_msg = f"Invalid phone number format: {phone}"
                    logger.warning(error_msg)
                    results.append({
                        "phone": phone,
                        "customerName": customer_name,
                        "success": False,
                        "error": error_msg
                    })
                    continue
                
                logger.info(f"Formatted phone: {phone} -> {formatted_phone}")
                
                # Format phone for WhatsApp (add whatsapp: prefix)
                whatsapp_to = f"whatsapp:{formatted_phone}"
                
                logger.info(f"Preparing to send WhatsApp to {whatsapp_to} for {customer_name}")
                logger.info(f"Message preview (first 50 chars): {message[:50]}...")
                logger.info(f"From: {TWILIO_WHATSAPP_FROM}, To: {whatsapp_to}")
                
                # Send WhatsApp message via Twilio
                logger.info("Calling Twilio API...")
                twilio_message = twilio_client.messages.create(
                    body=message,
                    from_=TWILIO_WHATSAPP_FROM,
                    to=whatsapp_to
                )
                
                logger.info(f"WhatsApp sent successfully! SID: {twilio_message.sid}, Status: {twilio_message.status}")
                logger.info(f"Full Twilio response: {twilio_message.sid} - Status: {twilio_message.status}, Error Code: {getattr(twilio_message, 'error_code', 'N/A')}, Error Message: {getattr(twilio_message, 'error_message', 'N/A')}")
                
                results.append({
                    "phone": phone,
                    "formattedPhone": formatted_phone,
                    "customerName": customer_name,
                    "success": True,
                    "messageId": twilio_message.sid,
                    "status": twilio_message.status
                })
                
            except Exception as e:
                error_msg = str(e)
                error_type = type(e).__name__
                logger.error(f"Error sending WhatsApp to {phone} (Type: {error_type}): {error_msg}", exc_info=True)
                
                # Extract more details from Twilio exceptions
                if hasattr(e, 'msg'):
                    error_msg = f"{error_msg} - {e.msg}"
                if hasattr(e, 'code'):
                    error_msg = f"{error_msg} (Code: {e.code})"
                
                results.append({
                    "phone": phone,
                    "customerName": customer_name,
                    "success": False,
                    "error": error_msg,
                    "errorType": error_type
                })
        
        success_count = sum(1 for r in results if r.get('success'))
        
        logger.info(f"WhatsApp send completed: {success_count}/{len(recipients)} successful")
        logger.info(f"Results summary: {json.dumps(results, indent=2)}")
        
        return jsonify({
            "success": True,
            "total": len(recipients),
            "sent": success_count,
            "failed": len(recipients) - success_count,
            "results": results
        })
        
    except Exception as e:
        error_type = type(e).__name__
        error_msg = str(e)
        logger.error(f"WhatsApp send endpoint error (Type: {error_type}): {error_msg}", exc_info=True)
        return jsonify({
            "error": f"An internal error occurred: {error_msg}",
            "errorType": error_type
        }), 500

if __name__ == '__main__':
    # Get port from environment variable (GCP Cloud Run sets PORT)
    port = int(os.environ.get('PORT', 4000))
    host = os.environ.get('HOST', '0.0.0.0')
    debug = os.environ.get('DEBUG', 'False').lower() == 'true'
    
    logger.info(f"Starting Forecast Service on http://{host}:{port}")
    logger.info(f"Health check: http://{host}:{port}/health")
    logger.info(f"Segmentation endpoint: http://{host}:{port}/segmentation")
    logger.info(f"WhatsApp endpoint: http://{host}:{port}/whatsapp/send")
    app.run(host=host, port=port, debug=debug)

