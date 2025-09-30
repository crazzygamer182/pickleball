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
  const dashboardUrl = 'https://vanpickleballsmash.com/dashboard';
  
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
  const dashboardUrl = 'https://vanpickleballsmash.com/dashboard';
  
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

export const sendPickleballDoublesMatchNotificationEmails = async (
  team1Player1Email: string, team1Player1Name: string, team1Player1Phone: string | undefined,
  team1Player2Email: string, team1Player2Name: string, team1Player2Phone: string | undefined,
  team2Player1Email: string, team2Player1Name: string, team2Player1Phone: string | undefined,
  team2Player2Email: string, team2Player2Name: string, team2Player2Phone: string | undefined,
  week: number
) => {
  const dashboardUrl = 'https://vanpickleballsmash.com/dashboard';
  
  // Helper function to create email for each player
  const createEmailForPlayer = (
    playerEmail: string,
    playerName: string,
    partnerName: string,
    partnerPhone: string | undefined,
    opponent1Name: string,
    opponent1Phone: string | undefined,
    opponent2Name: string,
    opponent2Phone: string | undefined
  ): EmailData => ({
    to: playerEmail,
    from: 'Vancouver Pickleball Smash <admin@vancouvertennisclash.com>',
    subject: `Doubles Match Scheduled - Week ${week} - Vancouver Pickleball Smash`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb;">🏓 Vancouver Pickleball Smash</h2>
        <p>Hello ${playerName},</p>
        <p>You have a doubles match scheduled for <strong>Week ${week}</strong>!</p>
        
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #1f2937;">Match Details</h3>
          <p style="margin: 0; color: #6b7280;">
            <strong>Week:</strong> ${week}<br>
            <strong>Format:</strong> Doubles Match
          </p>
        </div>

        <div style="background-color: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #1e40af;">Your Partner</h3>
          <p style="margin: 0; color: #1e40af;">
            <strong>Name:</strong> ${partnerName}<br>
            <strong>Phone:</strong> ${partnerPhone || 'Not provided'}
          </p>
        </div>

        <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #92400e;">Opposing Team</h3>
          <p style="margin: 0; color: #92400e;">
            <strong>${opponent1Name}</strong><br>
            Phone: ${opponent1Phone || 'Not provided'}<br><br>
            <strong>${opponent2Name}</strong><br>
            Phone: ${opponent2Phone || 'Not provided'}
          </p>
        </div>

        <p>Please coordinate with your partner and the opposing team to schedule your match. You can view all your match details and submit scores on your dashboard.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${dashboardUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
            View Dashboard
          </a>
        </div>

        <p style="color: #6b7280; font-size: 14px;">
          <strong>Dashboard Link:</strong> <a href="${dashboardUrl}" style="color: #2563eb;">${dashboardUrl}</a>
        </p>

        <p>Good luck with your doubles match!</p>
        <p>Best regards,<br>Vancouver Pickleball Smash Admin Team</p>
      </div>
    `,
    text: `Hello ${playerName},

You have a doubles match scheduled for Week ${week}!

Match Details:
- Week: ${week}
- Format: Doubles Match

Your Partner:
- Name: ${partnerName}
- Phone: ${partnerPhone || 'Not provided'}

Opposing Team:
- ${opponent1Name} (Phone: ${opponent1Phone || 'Not provided'})
- ${opponent2Name} (Phone: ${opponent2Phone || 'Not provided'})

Please coordinate with your partner and the opposing team to schedule your match. You can view all your match details and submit scores on your dashboard.

Dashboard: ${dashboardUrl}

Good luck with your doubles match!

Best regards,
Vancouver Pickleball Smash Admin Team`
  });

  // Create emails for all 4 players
  const emails = [
    createEmailForPlayer(
      team1Player1Email, team1Player1Name,
      team1Player2Name, team1Player2Phone,
      team2Player1Name, team2Player1Phone,
      team2Player2Name, team2Player2Phone
    ),
    createEmailForPlayer(
      team1Player2Email, team1Player2Name,
      team1Player1Name, team1Player1Phone,
      team2Player1Name, team2Player1Phone,
      team2Player2Name, team2Player2Phone
    ),
    createEmailForPlayer(
      team2Player1Email, team2Player1Name,
      team2Player2Name, team2Player2Phone,
      team1Player1Name, team1Player1Phone,
      team1Player2Name, team1Player2Phone
    ),
    createEmailForPlayer(
      team2Player2Email, team2Player2Name,
      team2Player1Name, team2Player1Phone,
      team1Player1Name, team1Player1Phone,
      team1Player2Name, team1Player2Phone
    )
  ];

  // Send all emails
  await Promise.all(emails.map(email => sendEmail(email)));
};

export const sendPickleballDoublesMatchCancellationEmails = async (
  team1Player1Email: string, team1Player1Name: string,
  team1Player2Email: string, team1Player2Name: string,
  team2Player1Email: string, team2Player1Name: string,
  team2Player2Email: string, team2Player2Name: string,
  week: number
) => {
  const dashboardUrl = 'https://vanpickleballsmash.com/dashboard';
  
  const createCancellationEmail = (
    playerEmail: string,
    playerName: string,
    partnerName: string,
    opponent1Name: string,
    opponent2Name: string
  ): EmailData => ({
    to: playerEmail,
    from: 'Vancouver Pickleball Smash <admin@vancouvertennisclash.com>',
    subject: `Match Cancelled - Week ${week} - Vancouver Pickleball Smash`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #dc2626;">🏓 Vancouver Pickleball Smash - Match Cancelled</h2>
        <p>Hello ${playerName},</p>
        <p>Your doubles match for <strong>Week ${week}</strong> has been <strong>cancelled</strong>.</p>
        
        <div style="background-color: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
          <h3 style="margin: 0 0 10px 0; color: #991b1b;">Cancelled Match Details</h3>
          <p style="margin: 0; color: #7f1d1d;">
            <strong>Week:</strong> ${week}<br>
            <strong>Your Partner:</strong> ${partnerName}<br>
            <strong>Opposing Team:</strong> ${opponent1Name} & ${opponent2Name}<br>
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
    text: `Hello ${playerName},

Your doubles match for Week ${week} has been CANCELLED.

Cancelled Match Details:
- Week: ${week}
- Your Partner: ${partnerName}
- Opposing Team: ${opponent1Name} & ${opponent2Name}
- Status: CANCELLED

This match has been cancelled by the admin team. You can view your updated match schedule on your dashboard.

Dashboard: ${dashboardUrl}

If you have any questions about this cancellation, please contact the admin team.

Best regards,
Vancouver Pickleball Smash Admin Team`
  });

  // Create cancellation emails for all 4 players
  const emails = [
    createCancellationEmail(
      team1Player1Email, team1Player1Name,
      team1Player2Name,
      team2Player1Name, team2Player2Name
    ),
    createCancellationEmail(
      team1Player2Email, team1Player2Name,
      team1Player1Name,
      team2Player1Name, team2Player2Name
    ),
    createCancellationEmail(
      team2Player1Email, team2Player1Name,
      team2Player2Name,
      team1Player1Name, team1Player2Name
    ),
    createCancellationEmail(
      team2Player2Email, team2Player2Name,
      team2Player1Name,
      team1Player1Name, team1Player2Name
    )
  ];

  // Send all cancellation emails
  await Promise.all(emails.map(email => sendEmail(email)));
};

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

export const sendMembershipRenewalReminder = async (userName: string, userEmail: string, ladderName: string) => {
  const renewUrl = 'https://vanpickleballsmash.com/renew';

  const emailData: EmailData = {
    to: userEmail,
    from: 'Vancouver Pickleball Smash <admin@vancouvertennisclash.com>',
    subject: 'Renew Your Membership - Vancouver Pickleball Smash',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #dc2626;">🏓 Your Membership Needs Renewal</h2>
        <p>Hello ${userName},</p>
        <p>Your membership for <strong>${ladderName}</strong> has expired and needs to be renewed to continue playing matches this month.</p>

        <div style="background-color: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
          <h3 style="margin: 0 0 10px 0; color: #991b1b;">Action Required</h3>
          <p style="margin: 0; color: #7f1d1d;">
            <strong>Ladder:</strong> ${ladderName}<br>
            <strong>Status:</strong> <span style="color: #dc2626; font-weight: bold;">EXPIRED</span>
          </p>
        </div>

        <div style="background-color: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #1e40af;">What's Next?</h3>
          <p style="margin: 0; color: #1e40af;">
            Renewing your membership will allow you to play matches until <strong>November 1st</strong>, which is the end of the October season.
          </p>
        </div>

        <p>Don't miss out on the action! Renew now to continue competing in the ladder.</p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${renewUrl}" style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
            Renew Membership Now
          </a>
        </div>

        <p style="color: #6b7280; font-size: 14px;">
          <strong>Renewal Link:</strong> <a href="${renewUrl}" style="color: #2563eb;">${renewUrl}</a>
        </p>

        <p>If you have any questions, please don't hesitate to reach out to us.</p>
        <p>Best regards,<br>Vancouver Pickleball Smash Admin Team</p>
      </div>
    `,
    text: `Hello ${userName},

Your membership for ${ladderName} has expired and needs to be renewed to continue playing matches this month.

Ladder: ${ladderName}
Status: EXPIRED

What's Next?
Renewing your membership will allow you to play matches until November 1st, which is the end of the October season.

Don't miss out on the action! Renew now to continue competing in the ladder.

Renewal Link: ${renewUrl}

If you have any questions, please don't hesitate to reach out to us.

Best regards,
Vancouver Pickleball Smash Admin Team`
  };

  return sendEmail(emailData);
}; 