import { supabase } from './supabase'

export interface EmailData {
  to: string
  subject: string
  text?: string
  html?: string
  from?: string
}

export const sendEmail = async (emailData: EmailData) => {
  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: emailData
    })

    if (error) {
      throw new Error(error.message)
    }

    return data
  } catch (error) {
    console.error('Error sending email:', error)
    throw error
  }
}

export const sendTestEmail = async (playerEmail: string, playerName: string) => {
  const emailData: EmailData = {
    to: playerEmail,
    from: 'Vancouver Pickleball Smash <admin@vancouvertennisclash.com>',
    subject: 'Test Email from Vancouver Pickleball Smash',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb;">🎾 Vancouver Pickleball Smash</h2>
        <p>Hello ${playerName},</p>
        <p>This is a test email from the Vancouver Pickleball Smash admin system.</p>
        <p>If you're receiving this email, it means our automated email system is working correctly!</p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #6b7280;">
            <strong>Email Details:</strong><br>
            Sent from: admin@vancouvertennisclash.com<br>
            Sent to: ${playerEmail}<br>
            Timestamp: ${new Date().toLocaleString()}
          </p>
        </div>
        <p>Thank you for being part of our pickleball community!</p>
        <p>Best regards,<br>Vancouver Pickleball Smash Admin Team</p>
      </div>
    `,
    text: `Hello ${playerName},\n\nThis is a test email from the Vancouver Pickleball Smash admin system.\n\nIf you're receiving this email, it means our automated email system is working correctly!\n\nThank you for being part of our pickleball community!\n\nBest regards,\nVancouver Pickleball Smash Admin Team`
  }

  return sendEmail(emailData)
}

export const sendMatchNotificationEmail = async (player1Email: string, player1Name: string, player1Phone: string | undefined, player2Email: string, player2Name: string, player2Phone: string | undefined, week: number) => {
  const dashboardUrl = 'https://vancouverpickleballsmash.com/dashboard';
  
  // Email for Player 1
  const emailData1: EmailData = {
    to: player1Email,
    from: 'Vancouver Pickleball Smash <admin@vancouvertennisclash.com>',
    subject: `Match Scheduled - Week ${week} - Vancouver Pickleball Smash`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb;">🎾 Vancouver Pickleball Smash</h2>
        <p>Hello ${player1Name},</p>
        <p>You have a match scheduled for <strong>Week ${week}</strong>!</p>
        
                 <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
           <h3 style="margin: 0 0 10px 0; color: #1f2937;">Match Details</h3>
           <p style="margin: 0; color: #6b7280;">
             <strong>Your Opponent:</strong> ${player2Name}<br>
             <strong>Week:</strong> ${week}
           </p>
         </div>

        <div style="background-color: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #1e40af;">Opponent Contact Information</h3>
          <p style="margin: 0; color: #1e40af;">
            <strong>Name:</strong> ${player2Name}<br>
            <strong>Phone:</strong> ${player2Phone || 'Not provided'}
          </p>
        </div>

        <p>Please coordinate with your opponent to schedule your match. You can view all your match details and submit scores on your dashboard.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${dashboardUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
            View Dashboard
          </a>
        </div>

        <p style="color: #6b7280; font-size: 14px;">
          <strong>Dashboard Link:</strong> <a href="${dashboardUrl}" style="color: #2563eb;">${dashboardUrl}</a>
        </p>

        <p>Good luck with your match!</p>
        <p>Best regards,<br>Vancouver Pickleball Smash Admin Team</p>
      </div>
    `,
         text: `Hello ${player1Name},\n\nYou have a match scheduled for Week ${week}!\n\nMatch Details:\n- Your Opponent: ${player2Name}\n- Week: ${week}\n\nOpponent Contact Information:\n- Name: ${player2Name}\n- Phone: ${player2Phone || 'Not provided'}\n\nPlease coordinate with your opponent to schedule your match. You can view all your match details and submit scores on your dashboard.\n\nDashboard: ${dashboardUrl}\n\nGood luck with your match!\n\nBest regards,\nVancouver Pickleball Smash Admin Team`
  };

  // Email for Player 2
  const emailData2: EmailData = {
    to: player2Email,
    from: 'Vancouver Pickleball Smash <admin@vancouvertennisclash.com>',
    subject: `Match Scheduled - Week ${week} - Vancouver Pickleball Smash`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb;">🎾 Vancouver Pickleball Smash</h2>
        <p>Hello ${player2Name},</p>
        <p>You have a match scheduled for <strong>Week ${week}</strong>!</p>
        
                 <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
           <h3 style="margin: 0 0 10px 0; color: #1f2937;">Match Details</h3>
           <p style="margin: 0; color: #6b7280;">
             <strong>Your Opponent:</strong> ${player1Name}<br>
             <strong>Week:</strong> ${week}
           </p>
         </div>

        <div style="background-color: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #1e40af;">Opponent Contact Information</h3>
          <p style="margin: 0; color: #1e40af;">
            <strong>Name:</strong> ${player1Name}<br>
            <strong>Phone:</strong> ${player1Phone || 'Not provided'}
          </p>
        </div>

        <p>Please coordinate with your opponent to schedule your match. You can view all your match details and submit scores on your dashboard.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${dashboardUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
            View Dashboard
          </a>
        </div>

        <p style="color: #6b7280; font-size: 14px;">
          <strong>Dashboard Link:</strong> <a href="${dashboardUrl}" style="color: #2563eb;">${dashboardUrl}</a>
        </p>

        <p>Good luck with your match!</p>
        <p>Best regards,<br>Vancouver Pickleball Smash Admin Team</p>
      </div>
    `,
         text: `Hello ${player2Name},\n\nYou have a match scheduled for Week ${week}!\n\nMatch Details:\n- Your Opponent: ${player1Name}\n- Week: ${week}\n\nOpponent Contact Information:\n- Name: ${player1Name}\n- Phone: ${player1Phone || 'Not provided'}\n\nPlease coordinate with your opponent to schedule your match. You can view all your match details and submit scores on your dashboard.\n\nDashboard: ${dashboardUrl}\n\nGood luck with your match!\n\nBest regards,\nVancouver Pickleball Smash Admin Team`
  };

  // Send both emails
  await Promise.all([
    sendEmail(emailData1),
    sendEmail(emailData2)
  ]);
}

export const sendMatchCancellationEmail = async (player1Email: string, player1Name: string, player2Email: string, player2Name: string, week: number) => {
  const dashboardUrl = 'https://vancouverpickleballsmash.com/dashboard';
  
  // Email for Player 1
  const emailData1: EmailData = {
    to: player1Email,
    from: 'Vancouver Pickleball Smash <admin@vancouvertennisclash.com>',
    subject: `Match Cancelled - Week ${week} - Vancouver Pickleball Smash`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #dc2626;">🎾 Vancouver Pickleball Smash</h2>
        <p>Hello ${player1Name},</p>
        <p>Your match for <strong>Week ${week}</strong> has been <strong>cancelled</strong>.</p>
        
        <div style="background-color: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
          <h3 style="margin: 0 0 10px 0; color: #991b1b;">Cancelled Match Details</h3>
          <p style="margin: 0; color: #7f1d1d;">
            <strong>Your Opponent:</strong> ${player2Name}<br>
            <strong>Week:</strong> ${week}<br>
            <strong>Status:</strong> <span style="color: #dc2626; font-weight: bold;">CANCELLED</span>
          </p>
        </div>

        <p>This match has been cancelled by the admin team. You can view your updated match schedule on your dashboard.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${dashboardUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
            View Dashboard
          </a>
        </div>

        <p style="color: #6b7280; font-size: 14px;">
          <strong>Dashboard Link:</strong> <a href="${dashboardUrl}" style="color: #2563eb;">${dashboardUrl}</a>
        </p>

        <p>If you have any questions about this cancellation, please contact the admin team.</p>
        <p>Best regards,<br>Vancouver Pickleball Smash Admin Team</p>
      </div>
    `,
    text: `Hello ${player1Name},\n\nYour match for Week ${week} has been CANCELLED.\n\nCancelled Match Details:\n- Your Opponent: ${player2Name}\n- Week: ${week}\n- Status: CANCELLED\n\nThis match has been cancelled by the admin team. You can view your updated match schedule on your dashboard.\n\nDashboard: ${dashboardUrl}\n\nIf you have any questions about this cancellation, please contact the admin team.\n\nBest regards,\nVancouver Pickleball Smash Admin Team`
  };

  // Email for Player 2
  const emailData2: EmailData = {
    to: player2Email,
    from: 'Vancouver Pickleball Smash <admin@vancouvertennisclash.com>',
    subject: `Match Cancelled - Week ${week} - Vancouver Pickleball Smash`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #dc2626;">🎾 Vancouver Pickleball Smash</h2>
        <p>Hello ${player2Name},</p>
        <p>Your match for <strong>Week ${week}</strong> has been <strong>cancelled</strong>.</p>
        
        <div style="background-color: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
          <h3 style="margin: 0 0 10px 0; color: #991b1b;">Cancelled Match Details</h3>
          <p style="margin: 0; color: #7f1d1d;">
            <strong>Your Opponent:</strong> ${player1Name}<br>
            <strong>Week:</strong> ${week}<br>
            <strong>Status:</strong> <span style="color: #dc2626; font-weight: bold;">CANCELLED</span>
          </p>
        </div>

        <p>This match has been cancelled by the admin team. You can view your updated match schedule on your dashboard.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${dashboardUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
            View Dashboard
          </a>
        </div>

        <p style="color: #6b7280; font-size: 14px;">
          <strong>Dashboard Link:</strong> <a href="${dashboardUrl}" style="color: #2563eb;">${dashboardUrl}</a>
        </p>

        <p>If you have any questions about this cancellation, please contact the admin team.</p>
        <p>Best regards,<br>Vancouver Pickleball Smash Admin Team</p>
      </div>
    `,
    text: `Hello ${player2Name},\n\nYour match for Week ${week} has been CANCELLED.\n\nCancelled Match Details:\n- Your Opponent: ${player1Name}\n- Week: ${week}\n- Status: CANCELLED\n\nThis match has been cancelled by the admin team. You can view your updated match schedule on your dashboard.\n\nDashboard: ${dashboardUrl}\n\nIf you have any questions about this cancellation, please contact the admin team.\n\nBest regards,\nVancouver Pickleball Smash Admin Team`
  };

  // Send both emails
  await Promise.all([
    sendEmail(emailData1),
    sendEmail(emailData2)
  ]);
} 

export const sendAdminJoinNotification = async (userName: string, userEmail: string, ladderName: string) => {
  const emailData: EmailData = {
    to: 'nirmay.singh.lamba@gmail.com',
    from: 'Vancouver Pickleball Smash <admin@vancouvertennisclash.com>',
    subject: `New User Joined Ladder - ${ladderName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb;">🎾 New Ladder Member</h2>
        <p>A new user has joined one of the pickleball ladders!</p>
        
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #1f2937;">New Member Details</h3>
          <p style="margin: 0; color: #6b7280;">
            <strong>Name:</strong> ${userName}<br>
            <strong>Email:</strong> ${userEmail}<br>
            <strong>Ladder Joined:</strong> ${ladderName}<br>
            <strong>Join Date:</strong> ${new Date().toLocaleDateString()}
          </p>
        </div>

        <p>This is an automated notification. No action required.</p>
        
        <p>Best regards,<br>Vancouver Pickleball Smash System</p>
      </div>
    `,
    text: `New Ladder Member\n\nA new user has joined one of the pickleball ladders!\n\nNew Member Details:\n- Name: ${userName}\n- Email: ${userEmail}\n- Ladder Joined: ${ladderName}\n- Join Date: ${new Date().toLocaleDateString()}\n\nThis is an automated notification. No action required.\n\nBest regards,\nVancouver Pickleball Smash System`
  };

  try {
    await sendEmail(emailData);
  } catch (error) {
    console.error('Error sending admin join notification:', error);
    // Don't throw error to avoid affecting user experience
  }
}; 