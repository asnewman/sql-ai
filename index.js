import OpenAI from "openai";
import sqlite3 from "sqlite3";
import { open } from "sqlite";

async function main() {
  const db = await open({
    filename: process.argv[2],
    driver: sqlite3.Database,
  });

  try {
    const tables = await db.all(
      "SELECT name FROM sqlite_master WHERE type='table'"
    );

    let schemaString = "";
    for (let table of tables) {
      schemaString += `Schema for table: ${table.name}`;
      const tableSchema = await db.all(`PRAGMA table_info(${table.name})`);
      schemaString += tableSchema;
    }

    const openai = new OpenAI();

    const chatLog = [
      {
        role: "system",
        content:
          "You are machine that generates sql statements based on user queries. Here are the sqlite database table schemas: " +
          schemaString,
      },
    ];

    const prompt = `Generate me a sql statement for the following query: ${process.argv[3]}`;

    chatLog.push({ role: "user", content: prompt });

    const completions = await openai.chat.completions.create({
      messages: chatLog,
      model: "gpt-3.5-turbo",
    });

    const sqlStatement = completions.choices[0].message.content;
    console.log("Running:\n" + sqlStatement + "\n\n");

    const result = await db.get(sqlStatement);
    console.log(result);
  } catch (err) {
    console.error(err.message);
  } finally {
    await db.close();
  }
}

main();
