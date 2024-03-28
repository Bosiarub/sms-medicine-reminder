"use strict";
const { PrismaClient } = require('@prisma/client');
const nodemailer = require('nodemailer');
const { CronJob } = require('cron');
const dotenv = require('dotenv');

dotenv.config();

const { API_KEY, PARTNER_ID, SHORTCODE } = process.env;
console.log('API_KEY', API_KEY, 'PARTNER_ID', PARTNER_ID, 'SHORTCODE', SHORTCODE);

const prisma = new PrismaClient();

type Patient = {
  id: string;
  name: string;
  phoneNumber: string;
  medicineName: string;
  email: string;
  dosage: string;
  days: string[];
  dosetimes: string[];
};

const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false,
  auth: {
    user: 'wearsworks@gmail.com',
    pass: 'AYcB4Sy65MJEDzsF',
  },
});

// Function to send Email
const sendReminder = async (email: string, medicineName: string, dosage: string) => {
  try {
    const info = await transporter.sendMail({
      from: '"WearsWorks 👻" <wearsworks@gmail.com>',
      to: email,
      subject: 'Medication Reminder',
      text: `Please take your ${medicineName} (${dosage}) as prescribed.`,
      html: `<p>Please take your ${medicineName} (${dosage}) as prescribed.</p>`
    });

    console.log('Message sent: %s', info.messageId);
  } catch (error: any) {
    console.error('Error sending reminder:', error.message);
  }
};

// Function to send SMS
const sendSMS = async (apiKey: string, partnerID: string, message: string, shortcode: string, mobile: string) => {
   if (!apiKey || !partnerID || !shortcode || !mobile || !message) {
    throw new Error('API_KEY, PARTNER_ID, and SHORTCODE must be provided');
  }
  try {
    const response = await fetch('https://sms.emreignltd.com/api/services/sendsms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        apikey: apiKey,
        partnerID: partnerID,
        message: message,
        shortcode: "EMREIGN_SMS",
        mobile: mobile
      })
    });

    if (response.ok) {
      const responseData = await response.json();
      console.log('SMS sent successfully', responseData);
      return responseData;
    } else {
      const errorData = await response.json();
      console.log('Error sending SMS', errorData);
      
      throw new Error(errorData);
    }
  } catch (error) {
    throw new Error(`Error sending SMS: ${error}`);
  }
};

const scheduleReminders = async () => {
  try {
    const patients: Patient[] = await prisma.patient.findMany();

    // Adjusted cron schedule format to start at 16:16
    // const TestreminderTimes = ['47/5 16 * * *', '0/5 17 * * *', '0/5 18 * * *', '0/5 19 * * *', '0/5 20 * * *', '0/5 21 * * *'];
    // From 7:50 AM , 12:50 PM, 8:50 PM ['50 7 * * *', '50 12 * * *', '50 20 * * *'];
    const reminderTimes = ['40/3 12 * * *', '43/3 12 * * *'];


    patients.forEach((patient: { email: any; name:any; medicineName: any; dosage: any; days: any; phoneNumber: any;dosetimes:string[] }) => {
      const { email, medicineName, dosage, days,phoneNumber,dosetimes } = patient;
      console.log("doetimes:", dosetimes)
      console.log('Patient:', patient);
      console.log("reminderTimes:", reminderTimes);
      dosetimes.forEach((time) => {
        console.log('Time:', time);
        //sunday, monday, tuesday, wednesday, thursday, friday, saturday
        const today = new Date().toLocaleString('en-us', { weekday: 'long' }).toLowerCase();
        console.log('Today:', today);
        if (days.includes(today)) {
          console.log('Reminder scheduled for:', time);
          const message =`Hello ${patient.name}, please take your ${medicineName} (${dosage}) as prescribed.`
          const mobile = patient.phoneNumber;
          const job = new CronJob
            (time, 
              async function () {
                console.log('You will see this message every second');
                sendReminder(email, medicineName, dosage);
                const response = await sendSMS(API_KEY!, PARTNER_ID!, message, SHORTCODE!, mobile);
             
              }, // onTick
              null, // onComplete
              true, // start
              'Africa/Nairobi' // timeZone kenya // 
            );
           

          job.start();
        }
      });
    });

    console.log('Reminders scheduled successfully');
  } catch (error) {
    console.error('Error scheduling reminders:', error);
  }
};

console.log('Scheduling reminders...');

scheduleReminders();
