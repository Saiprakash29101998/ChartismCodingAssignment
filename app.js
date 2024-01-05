const express = require("express");
const app = express();
app.use(express.json());
const path = require("path");
const dbPath = path.join(__dirname, "todoApplication.db");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const format = require("date-fns/format");

let db = null;

const initializeDBAndServer = async (request, response) => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (error) {
    console.log(`DB Error: ${error}`);
    process.exit(1);
  }
};

initializeDBAndServer();

// Authenticate Token
const authenticateToken = async(request, response, next) => {
    const authHeader = request.headers;
    let jwtToken;
    if (authHeader === undefined){
        response.status(400);
        response.send("Invalid JWT Token");
    }
    else{
        jwtToken = authHeader.split(" ")[1];
        if (jwtToken === undefined){
            response.status(400);
            response.send("Invalid JWT Token");
        }
        else{
            jwt.verify(jwtToken, "jwtToken", async(error, payload){
                if (error){
                    response.status(400);
                    response.send("Invalid JWT Token")
                }
                else{
                    response.username = payload.username;
                    next();
                }
            })
        }
    }
}

//API 1

app.get("/todos/", authenticateToken, async (request, response) => {
  const { status, priority, search_q = "", category } = request.query;
  let getTodosQuery;
  switch (true) {
    case status !== undefined &&
      priority === undefined &&
      category === undefined:
      getTodosQuery = `
      SELECT id, todo, priority, status, category, due_date AS dueDate
      FROM todo
      WHERE todo LIKE "%${search_q}%" AND
      status = '${status}'
          `;
      break;

    case priority !== undefined &&
      status === undefined &&
      category === undefined:
      getTodosQuery = `
      SELECT id, todo, priority, status, category, due_date AS dueDate
      FROM todo
      WHERE todo LIKE "%${search_q}%" AND
      priority = '${priority}'
      `;
      break;
    case priority !== undefined &&
      status !== undefined &&
      category === undefined:
      getTodosQuery = `
      SELECT id, todo, priority, status, category, due_date AS dueDate
      FROM todo
      WHERE todo LIKE "%${search_q}%" AND
      status = '${status}' AND 
      priority = '${priority}'
      `;
      break;
    case category !== undefined &&
      status !== undefined &&
      priority === undefined:
      getTodosQuery = `
      SELECT id, todo, priority, status, category, due_date AS dueDate
      FROM todo
      WHERE todo LIKE "%${search_q}%" AND
      status = '${status}' AND 
      category = '${category}'
      `;
      break;
    case category !== undefined &&
      status === undefined &&
      priority === undefined:
      getTodosQuery = `
      SELECT id, todo, priority, status, category, due_date AS dueDate
      FROM todo
      WHERE todo LIKE "%${search_q}%" AND
      category = '${category}'
      `;
      break;
    case category !== undefined &&
      priority !== undefined &&
      status === undefined:
      getTodosQuery = `
      SELECT id, todo, priority, status, category, due_date AS dueDate
      FROM todo
      WHERE todo LIKE "%${search_q}%" AND
      category = '${category}' AND
      priority = '${priority}'
      `;
      break;
    default:
      getTodosQuery = `
      SELECT id, todo, priority, status, category, due_date AS dueDate
      FROM todo
      WHERE todo LIKE "%${search_q}%" 
      `;
  }

  const todoList = await db.all(getTodosQuery);
  response.send(todoList);
});

//API 2

app.get("/todos/:todoId/", authenticateToken, async (request, response) => {
  const { todoId } = request.params;
  const getTodoQuery = `
      SELECT id, todo, priority, status, category, due_date AS dueDate
      FROM todo
      WHERE id = ${todoId} 
      `;
  const todoResponse = await db.get(getTodoQuery);
  response.send(todoResponse);
});

//API 3

app.get("/agenda/", authenticateToken, async (request, response) => {
  const { date } = request.query;
  const getTodosQuery = `
  SELECT id, todo, priority, status, category, due_date AS dueDate
  FROM todo
  WHERE due_date = '${date}'
  `;
  const todosList = await db.all(getTodosQuery);
  response.send(todosList);
});

//API 4

app.post("/todos/", authenticateToken, async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request.body;
  const createTodoQuery = `
      INSERT INTO todo(id,todo, priority, status, category, due_date)
      VALUES (${id}, '${todo}', '${priority}', '${status}', '${category}', '${dueDate}')
      `;
  await db.run(createTodoQuery);
  response.send("Todo Successfully Added");
});

//API 5

app.put("/todos/:todoId/", authenticateToken, async (request, response) => {
  const { todoId } = request.params;
  const { status, priority, todo, category, dueDate } = request.body;
  let updateTodoQuery;
  let parameter;
  switch (true) {
    case status !== undefined &&
      priority === undefined &&
      todo === undefined &&
      category === undefined &&
      dueDate === undefined:
      updateTodoQuery = `
        UPDATE todo
        SET status = '${status}'
        `;
      parameter = "Status";
      break;
    case status === undefined &&
      priority !== undefined &&
      todo === undefined &&
      category === undefined &&
      dueDate === undefined:
      updateTodoQuery = `
      UPDATE todo
      SET priority = '${priority}'
      `;
      parameter = "Priority";
      break;
    case status === undefined &&
      priority === undefined &&
      todo !== undefined &&
      category === undefined &&
      dueDate === undefined:
      updateTodoQuery = `
      UPDATE todo
      SET todo = '${todo}'
      `;

      parameter = "Todo";
      break;
    case status === undefined &&
      priority === undefined &&
      todo === undefined &&
      category !== undefined &&
      dueDate === undefined:
      updateTodoQuery = `
      UPDATE todo
      SET category = '${category}'
      `;
      parameter = "Category";
      break;
    case status === undefined &&
      priority === undefined &&
      todo === undefined &&
      category === undefined &&
      dueDate !== undefined:
      updateTodoQuery = `
        UPDATE todo
        SET due_date = '${dueDate}'
        `;
      parameter = "Due Date";
      break;
  }

  await db.run(updateTodoQuery);
  response.send(`${parameter} Updated`);
});

//API 6

app.delete("/todos/:todoId/", authenticateToken, async (request, response) => {
  const { todoId } = request.params;
  const deleteTodoQuery = `
    DELETE FROM todo
    WHERE id = ${todoId}
    `;
  await db.run(deleteTodoQuery);
  response.send("Todo Deleted");
});

module.exports = app;
