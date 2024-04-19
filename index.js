import express from "express";
import session from "express-session";
import bcrypt from "bcrypt";
import pool from "./db.js";

const app = express();

app.listen(process.env.PORT || 3000, () => {
  console.log("Server running http://localhost:3000");
});
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

app.use(express.urlencoded({ extended: false }));
app.use(
  session({
    secret: "my-secret-session-key",
    resave: false,
    saveUninitialized: true,
  })
);

function requireLogin(req, res, next) {
  if (req.session.userId) {
    next();
  } else {
    res.redirect("/");
  }
}

//routes
app.get("/", (req, res) => {
  if (req.session.userId) {
    // User is logged in, redirect to a different page
    res.redirect("/sales");
  } else {
    // User is not logged in, render the homepage
    res.render("index.ejs");
  }
});

app.get("/login", (req, res) => {
  res.render("login.ejs");
});

app.get("/register", (req, res) => {
  res.render("register.ejs");
});

app.get("/sales", requireLogin, async (req, res) => {
  const user_id = req.session.userId;
  try {
    const client = await pool.connect();
    console.log("Connected to database");

    const sales = await client.query(getSalesByUser, [user_id]);
    console.log("Fetching sales....");

    // Release the client back to the pool
    client.release();
    console.log("Client released back to the pool!");

    res.render("sales.ejs", {
      username: req.session.username,
      sales: sales.rows,
    });
  } catch (err) {
    console.error("Couldn't fetch sales: ", err);
    if (client) {
      client.release();
      console.log("Client released back to the pool!");
    }
    // Handle the error
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

app.get("/date", requireLogin, (req, res) => {
  res.render("date.ejs");
});
//end routes

app.post("/history", requireLogin, async (req, res) => {
  const user_id = req.session.userId;
  const date = req.body.date;

  try {
    const client = await pool.connect();
    console.log("connecting to database...");

    const sales = await client.query(getSalesByDate, [user_id, date]);
    console.log("Fetching sales...");

    await client.release();
    console.log("Client released back to the pool!");

    res.render("history.ejs", { sales: sales.rows, sale_date: date });
  } catch (error) {
    console.error("Couldn't fetch sales: ", error);
    res.redirect("back");
  }
});

app.post("/register", async (req, res) => {
  const username = req.body.username;
  const email = req.body.email;
  const password = req.body.password;
  const confirmPassword = req.body.confirmPassword;
  const saltRounds = 10;
  const salt = await bcrypt.genSalt(saltRounds);
  const hashedPassword = await bcrypt.hash(password, salt);

  if (password !== confirmPassword) {
    res.redirect("back");
  } else {
    try {
      const client = await pool.connect();
      console.log("connected to database");

      await client.query(insertUser, [username, email, hashedPassword]);
      console.log("User created");

      await client.release();
      console.log("Client released back to the pool!");

      res.redirect("/login");
    } catch (err) {
      console.log("failed to create user: ", err);
      res.redirect("back");
    }
  }
});

app.post("/login", async (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  try {
    const client = await pool.connect();
    console.log("Connected to database");

    const user = (await client.query(getUserByEmail, [email])).rows[0];
    console.log("Fetching user...");
    if (user && user.password) {
      const validUser = await bcrypt.compare(password, user.password);
      if (validUser) {
        req.session.userId = user.id;
        req.session.username = user.username;
        res.redirect("/sales");
      } else {
        console.log("Incorrect password");
      }
    } else {
      console.log("User doesn't exist or has no password");
      res.redirect("/register");
    }
    await client.release();
    console.log("Client released back to the pool!");
  } catch (err) {
    console.error("failed to check user: ", err);
  }
});

app.post("/addEntry", requireLogin, async (req, res) => {
  const item = req.body.item;
  const amount = req.body.amount;
  const total = req.body.total;
  const sale_date = req.body.date;
  const user_id = req.session.userId;

  try {
    // Process the data here
    const client = await pool.connect();
    console.log("Conected to database");

    await client.query(insertSale, [user_id, item, amount, total, sale_date]);
    console.log("Sale logged succesfully");

    await client.release();
    console.log("Client released back to the pool!");
    res.redirect("back");
    // Redirect back with a query parameter
    // res.redirect("/sales?submission=success");
  } catch (err) {
    console.error(err);
    res.redirect("back");
    // Redirect back with an error query parameter
    // res.redirect("/sales?submission=error");
  }
});

app.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error destroying session:", err);
      return res.redirect("/");
    }
    // Clear local storage and session storage
    res.clearCookie("connect.sid"); // This is the default cookie name for session IDs
    res.send(`
      <script>
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '/';
      </script>
    `);
  });
});

app.post("/delete", async (req, res) => {
  const sale_id = req.body.entryId;
  const user_id = req.session.userId;

  try {
    const client = await pool.connect();
    console.log("Connected to database");

    await client.query(deleteSale, [sale_id, user_id]);
    console.log("Deleting sale record..");

    await client.release();
    console.log("Client released back to the pool");

    res.redirect("/sales");
  } catch (err) {
    console.error("Can't delete entry: ", err);
    res.redirect("back");
  }
});

const insertUser =
  "INSERT INTO users (username, email, password) values ($1, $2, $3)";
const getSalesByUser =
  "select id, item, amount, total, sale_date from sales where user_id = ($1)";
const getUserByEmail =
  "select id, username, password from users where email like ($1)";
const insertSale =
  "INSERT INTO sales (user_id, item, amount, total, sale_date) values ($1, $2, $3, $4, $5)";
const deleteSale = "DELETE FROM sales WHERE id = ($1) AND user_id = ($2)";
const getSalesByDate =
  "select id, item, amount, total from sales where user_id = ($1) and sale_date = ($2)";
