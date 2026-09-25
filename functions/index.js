
const functions = require("firebase-functions");
const cors = require("cors")({ origin: true });

/**
 * This function is intentionally left without email sending capabilities.
 * It serves as a placeholder endpoint. Calling it will result in a
 * 'not configured' error.
 */
exports.sendEmail = functions.https.onRequest((req, res) => {
  cors(req, res, () => {
    console.error("The sendEmail function is called, but it is not configured to send emails.");
    // Always return a 501 Not Implemented error.
    return res.status(501).json({
        success: false,
        message: "Email functionality is not configured on the server."
    });
  });
});
