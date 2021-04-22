const nodemailer = require("nodemailer");
const emailConfig = require("../../config").email;

const defaultEmailSettings = {
    sender: "sinkhealth61@gmail.com",
    subject: "Audit Report",
    to: "caryl830@gmail.com",
}

const sendTenantReport = (receiverInfo, excelFile, res) => {
    const transporter = configTransporter();
    let mailOptions = generateMailOptions(receiverInfo, excelFile);

    transporter.sendMail(mailOptions, (err) => {
        if (err) {
            throw err;
            // console.error(err);
            // res.status(500).send(err);
        } else {
            res.sendStatus(200);
        }
    });
}

const configTransporter = () => {
    return nodemailer.createTransport({
        service: "gmail",
        auth: {
            type: "OAuth2",
            user: emailConfig.MAIL_USERNAME,
            pass: emailConfig.MAIL_PASSWORD,
            clientId: emailConfig.OAUTH_CLIENTID,
            clientSecret: emailConfig.OAUTH_CLIENT_SECRET,
            refreshToken: emailConfig.OAUTH_REFRESH_TOKEN,
        }
    });
}

const generateMailOptions = (receiverInfo, excelFile) => {
    let mailOptions = {
        from: defaultEmailSettings.sender,
        to: defaultEmailSettings.to, // receiverInfo.email,
        subject: defaultEmailSettings.subject + ` (${receiverInfo.reporttype})`,
        text: generateMessage(receiverInfo), 
        attachments: [{
            filename: excelFile.fileName,
            content: excelFile.buffer,
        }]
    };
    return mailOptions;
}

const generateMessage = (receiverInfo) => {
    let message = "Dear " + receiverInfo.name + ", \n"
    + "Please find attached the " + receiverInfo.reporttype + " audit report for your retail outlet, "
    + receiverInfo.outletname + ` (outlet Id ${receiverInfo.outletid}).`
    + "Regards, \n"
    + "Singhealth staff";
    return message;
}

module.exports = {
    sendTenantReport,
}