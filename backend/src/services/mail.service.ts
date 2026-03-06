type MailParams = {
  to: string;
  subject: string;
  body: string;
};

export const sendMailStub = async (mail: MailParams): Promise<void> => {
  // Placeholder until SMTP/provider integration is configured.
  // eslint-disable-next-line no-console
  console.log("[MAIL_STUB]", mail);
};
