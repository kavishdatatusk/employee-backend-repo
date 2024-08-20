const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(bodyParser.json());
app.use(cors());

// Connection to database
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'employee_records',
  password: 'datatusker2024',
  port: 5432,
});

// Handling adding new employees
app.post('/api/users', async (req, res) => {
  // Check if window is defined (not needed here, but just for demonstration)
  if (typeof window !== 'undefined') {
    console.log('Running in the browser');
  } else {
    console.log('Running in Node.js environment');
  }

  // Get all the data for insertion
  const { firstname, lastname, email, jobtitle, salary, department } = req.body;

  try {
    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT * FROM employees WHERE email = $1',
      [email]
    );

    if (existingUser.rowCount > 0) {
      return res.status(400).send('User with this email already exists');
    }

    // SQL query to insert all data into the database
    const newUser = await pool.query(
      'INSERT INTO employees (firstname, lastname, email, jobtitle, salary, department) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [firstname, lastname, email, jobtitle, salary, department]
    );
    res.json(newUser.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Handling deleting employees
app.delete('/api/users', async (req, res) => {
  const emailToDelete = req.query.email;

  // In case no email was inputted
  if (!emailToDelete) {
    return res.status(400).send('Email parameter is required');
  }

  try {
    // SQL query to delete the account from the database
    const deleteUser = await pool.query(
      'DELETE FROM employees WHERE email = $1 RETURNING *',
      [emailToDelete]
    );

    // In case no account with the email is found
    if (deleteUser.rowCount === 0) {
      return res.status(404).send('User not found');
    }
    res.json({ message: 'User deleted successfully', deletedUser: deleteUser.rows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Handling getting all employees
app.get('/api/users', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM employees');
    res.json(result.rows);
    client.release();
  } catch (err) {
    console.error('Error executing query', err);
    res.status(500).send('Server Error');
  }
});

// Handling editing employees
app.put('/api/users', async (req, res) => {
  // Get all the info that has been changed
  const { firstname, lastname, email, jobtitle, salary, department } = req.body;

  if (!email) {
    return res.status(400).send('Email parameter is required for updating');
  }

  try {
    const fields = [];
    const values = [];
    let idx = 1;

    if (firstname) {
      fields.push(`firstname = $${idx++}`);
      values.push(firstname);
    }
    if (lastname) {
      fields.push(`lastname = $${idx++}`);
      values.push(lastname);
    }
    if (jobtitle) {
      fields.push(`jobtitle = $${idx++}`);
      values.push(jobtitle);
    }
    if (salary) {
      fields.push(`salary = $${idx++}`);
      values.push(salary);
    }
    if (department) {
      fields.push(`department = $${idx++}`);
      values.push(department);
    }

    if (fields.length === 0) {
      return res.status(400).send('No fields to update');
    }

    values.push(email);
    const updatedUser = await pool.query(
      `UPDATE employees SET ${fields.join(', ')} WHERE email = $${idx} RETURNING *`,
      values
    );

    if (updatedUser.rowCount === 0) {
      return res.status(404).send('User not found');
    }
    res.json(updatedUser.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
