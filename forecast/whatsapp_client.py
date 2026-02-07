import os
import logging
from typing import List, Dict, Any

try:
    from twilio.rest import Client
except Exception:  # pragma: no cover - twilio may not be installed in all environments
    Client = None

logger = logging.getLogger(__name__)


def _ensure_whatsapp_prefix(number: str) -> str:
    if not number:
        return number
    return number if number.startswith('whatsapp:') else f'whatsapp:{number}'


def send_whatsapp(users: List[str], body: str, from_number: str | None = None) -> Dict[str, Any]:
    """Send a WhatsApp message to a list of numbers using Twilio.

    - Reads TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and optional TWILIO_WHATSAPP_FROM from env.
    - 'users' may be a list of phone numbers (with or without 'whatsapp:' prefix).
    - Returns a dict with 'sent' and 'failed' lists describing results.
    """
    account_sid = os.getenv('TWILIO_ACCOUNT_SID')
    auth_token = os.getenv('TWILIO_AUTH_TOKEN')
    default_from = os.getenv('TWILIO_WHATSAPP_FROM', 'whatsapp:+14155238886')

    if from_number:
        from_number = _ensure_whatsapp_prefix(from_number)
    else:
        from_number = _ensure_whatsapp_prefix(default_from)

    if not account_sid or not auth_token:
        raise RuntimeError('Twilio credentials not found in TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN')

    if Client is None:
        raise RuntimeError('twilio package is not installed. Add it to requirements.txt and install it.')

    client = Client(account_sid, auth_token)

    results: Dict[str, Any] = {'sent': [], 'failed': []}

    for user in users:
        to_number = _ensure_whatsapp_prefix(user)
        try:
            msg = client.messages.create(from_=from_number, body=body, to=to_number)
            results['sent'].append({'to': to_number, 'sid': getattr(msg, 'sid', None)})
            logger.info('WhatsApp message sent to %s, sid=%s', to_number, getattr(msg, 'sid', None))
        except Exception as e:
            logger.exception('Failed to send WhatsApp to %s', to_number)
            results['failed'].append({'to': to_number, 'error': str(e)})

    return results
