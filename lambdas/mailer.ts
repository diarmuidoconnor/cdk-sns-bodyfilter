import { SQSHandler } from "aws-lambda";
// import AWS from 'aws-sdk';
import { SES_EMAIL_FROM, SES_EMAIL_TO, SES_REGION } from "../env";
import {
  SESClient,
  SendEmailCommand,
  SendEmailCommandInput,
} from "@aws-sdk/client-ses";

if (!SES_EMAIL_TO || !SES_EMAIL_FROM || !SES_REGION) {
  throw new Error(
    "Please add the SES_EMAIL_TO, SES_EMAIL_FROM and SES_REGION environment variables in an env.js file located in the root directory"
  );
}

type ContactDetails = {
  name: string;
  email: string;
  message: string;
};

const client = new SESClient({ region: "eu-west-1" });

export const handler: SQSHandler = async (event: any) => {
  try {
    const { name, email, message } = {
      name: "The Photo Album",
      email: SES_EMAIL_FROM,
      message: "We received your Image. Thanks",
    };

    return await sendEmail({ name, email, message });
  } catch (error: unknown) {
    console.log("ERROR is: ", error);
    return;
  }
};

async function sendEmail({ name, email, message }: ContactDetails) {
  console.log("before send");
  const params = sendEmailParams({ name, email, message });
  await client.send(new SendEmailCommand(params));
  return;
}

function sendEmailParams({ name, email, message }: ContactDetails) {
  const parameters: SendEmailCommandInput = {
    Destination: {
      ToAddresses: [SES_EMAIL_TO],
    },
    Message: {
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: getHtmlContent({ name, email, message }),
        },
        Text: {
          Charset: "UTF-8",
          Data: getTextContent({ name, email, message }),
        },
      },
      Subject: {
        Charset: "UTF-8",
        Data: `Email from example ses app.`,
      },
    },
    Source: SES_EMAIL_FROM,
  };
  console.log("after params");

  return parameters;
}

function getHtmlContent({ name, email, message }: ContactDetails) {
  return `
    <html>
      <body>
        <h1>Received an Email. 📬</h1>
        <h2>Sent from: </h2>
        <ul>
          <li style="font-size:18px">👤 <b>${name}</b></li>
          <li style="font-size:18px">✉️ <b>${email}</b></li>
        </ul>
        <p style="font-size:18px">${message}</p>
      </body>
    </html> 
  `;
}

function getTextContent({ name, email, message }: ContactDetails) {
  return `
    Received an Email. 📬
    Sent from:
        👤 ${name}
        ✉️ ${email}
    ${message}
  `;
}
