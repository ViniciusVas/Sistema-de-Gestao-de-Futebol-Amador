import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma.js";

export async function register({ nome, email, senha }) {
  const userExists = await prisma.organizador.findUnique({
    where: { email }
  });

  if (userExists) {
    throw new Error("Email já cadastrado");
  }

  const senhaHash = await bcrypt.hash(senha, 10);

  const user = await prisma.organizador.create({
    data: {
      nome,
      email,
      senha: senhaHash
    }
  });

  return user;
}

export async function login({ email, senha }) {
  const user = await prisma.organizador.findUnique({
    where: { email }
  });

  if (!user) throw new Error("Usuário não encontrado");

  const senhaValida = await bcrypt.compare(senha, user.senha);

  if (!senhaValida) throw new Error("Senha inválida");

  const token = jwt.sign(
    { id: user.id },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

  return { user, token };
}