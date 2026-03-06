export const createCuidLikeId = (): string => {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "c";
  while (id.length < 25) {
    id += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return id;
};
