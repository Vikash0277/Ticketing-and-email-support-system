import { sendEmailEvent } from "./email.sender.js";

export async function dispatchEmail(payload) {
  return sendEmailEvent(payload);
}

export default dispatchEmail;
