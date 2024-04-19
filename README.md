# Project README

## Description
This project is a sales tracker application that allows users to manage and track their sales records. Users can register, login, add sales entries, view sales history, and delete entries.

## Technologies Used
- Node.js
- Express.js
- PostgreSQL
- EJS
- bcrypt
- express-session

## Setup Instructions
1. Clone the repository
2. Install dependencies using `npm install`
3. Set up a PostgreSQL database and update the connection details in `db.js`
4. Run the application using `npm run dev`
5. Access the application at `http://localhost:3000`

## Key Features
- User authentication (register, login)
- Add and view sales entries
- Delete sales entries
- Responsive design for mobile and desktop

## File Structure
- `index.js`: Express server setup
- `db.js`: PostgreSQL database connection
- `views/`: Contains EJS templates for different pages
- `public/`: Static assets like CSS and client-side JavaScript

## Additional Notes
- The project uses EJS for server-side templating.
- Styling is done using CSS variables for easy theming.