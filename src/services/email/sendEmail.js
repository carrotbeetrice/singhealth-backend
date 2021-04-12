const nodemailer = require("nodemailer");
const emailConfig = require("../../config").email;

const sendTenantReport = (req, res) => {
    let transporter =  nodemailer.createTransport({
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

    let mailOptions = {
        from: "sinkhealth61@gmail.com",
        to: "caryl830@gmail.com",
        subject: "Nodemailer Project",
        text: "CHEEESE",
    };

    transporter.sendMail(mailOptions, (err, data) => {
        if (err) {
            res.status(500).send(err);
        } else {
            res.sendStatus(200);
        }
    });
}

module.exports = {
    sendTenantReport,
}