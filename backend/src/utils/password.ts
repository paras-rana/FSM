import bcrypt from "bcryptjs";

export const hashPassword = async (plain: string): Promise<string> => {
  return bcrypt.hash(plain, 12);
};

export const verifyPassword = async (plain: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(plain, hash);
};
