CREATE DATABASE IF NOT EXISTS finance_db CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE finance_db;
CREATE TABLE IF NOT EXISTS usuarios (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 nome VARCHAR(100) NOT NULL,
 email VARCHAR(254) NOT NULL UNIQUE,
 senha_hash VARCHAR(255) NOT NULL,
 criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS categorias (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 usuario_id INT UNSIGNED NOT NULL,
 nome VARCHAR(80) NOT NULL,
 tipo ENUM('receita','despesa') NOT NULL,
 cor_hex CHAR(7) NOT NULL,
 UNIQUE (usuario_id,tipo,nome),
 UNIQUE (usuario_id,id),
 UNIQUE (usuario_id,id,tipo),
 FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);
CREATE TABLE IF NOT EXISTS transacoes (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 usuario_id INT UNSIGNED NOT NULL,
 categoria_id INT UNSIGNED NOT NULL,
 descricao VARCHAR(180) NOT NULL,
 valor DECIMAL(10,2) NOT NULL CHECK (valor > 0),
 data DATE NOT NULL,
 tipo ENUM('receita','despesa') NOT NULL,
 criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 INDEX (usuario_id,data),
 FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
 FOREIGN KEY (usuario_id,categoria_id,tipo) REFERENCES categorias(usuario_id,id,tipo)
);
CREATE TABLE IF NOT EXISTS orcamentos (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 usuario_id INT UNSIGNED NOT NULL,
 categoria_id INT UNSIGNED NOT NULL,
 limite_mensal DECIMAL(10,2) NOT NULL CHECK (limite_mensal > 0),
 mes_ano VARCHAR(7) NOT NULL,
 UNIQUE (usuario_id,mes_ano,categoria_id),
 FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
 FOREIGN KEY (usuario_id,categoria_id) REFERENCES categorias(usuario_id,id)
);
