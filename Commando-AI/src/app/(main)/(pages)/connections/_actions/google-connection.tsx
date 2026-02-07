"use server"

import { clerkClient } from "@clerk/nextjs/server"
import { auth } from "@clerk/nextjs/server"
import { google } from "googleapis"

export const getFileMetaData = async () => {
  try {
    // Get the authenticated user ID
    const { userId } = auth()

    if (!userId) {
      return { error: "User not authenticated", status: 401 }
    }

    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI,
    )

    // Get the user's OAuth tokens from Clerk
    const tokens = await clerkClient.users.getUserOauthAccessToken(userId, "oauth_google")

    if (!tokens) {
      return {
        error: "No Google OAuth connection found for this user",
        status: 400,
      }
    }

    // Set the access token
    const accessToken = tokens.data[0].token

    oauth2Client.setCredentials({
      access_token: accessToken,
    })

    // Initialize Google Drive API
    const drive = google.drive({ version: "v3", auth: oauth2Client })

    // List files from Google Drive
    const response = await drive.files.list({
      pageSize: 30,
      fields: "nextPageToken, files(id, name, mimeType, webViewLink, iconLink, thumbnailLink)",
    })

    return {
      files: response.data.files || [],
      nextPageToken: response.data.nextPageToken,
      status: 200,
    }
  } catch (error) {
    console.error("Error fetching Google Drive files:", error)
    return {
      error: error instanceof Error ? error.message : "Unknown error occurred",
      status: 500,
    }
  }
}

