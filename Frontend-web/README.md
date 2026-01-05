# Government College Larkana - Web Frontend

React + Vite + Tailwind CSS application for college management system.

## Setup

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
Frontend-web/
├── src/
│   ├── components/       # Reusable components
│   ├── context/          # React Context (State Management)
│   ├── layouts/          # Layout components
│   ├── pages/            # Page components
│   ├── routes/           # Route configuration
│   ├── utils/            # Utility functions (API, helpers)
│   ├── App.jsx           # Main App component
│   ├── main.jsx          # Entry point
│   └── index.css         # Global styles
├── public/               # Static assets
├── index.html            # HTML template
├── vite.config.js        # Vite configuration
├── tailwind.config.js    # Tailwind configuration
├── postcss.config.js     # PostCSS configuration
└── package.json          # Dependencies
```

## Tech Stack

- **React 18** - UI library
- **Vite** - Build tool
- **React Router 6** - Routing
- **Tailwind CSS** - Styling
- **Axios** - HTTP client
- **Context API** - State management

## Available Routes

- `/` - Home page
- `/login` - Login page
- `/register` - Register page
- `/admin/*` - Admin dashboard (protected)
- `/student/*` - Student dashboard (protected)
- `/teacher/*` - Teacher dashboard (protected)

## Features Implemented

✅ React + Vite setup
✅ Tailwind CSS configuration
✅ React Router setup
✅ Axios configuration with interceptors
✅ Context API for authentication
✅ Protected routes with role-based access
✅ Layout components (Main, Auth, Admin, Student, Teacher)
✅ Basic page components
✅ Environment configuration

## Development

Server runs on: http://localhost:3001
API proxy configured for: http://localhost:3000/api

## Next Steps

Week 38-39: Admin dashboard components
Week 40-41: Student portal components
Week 42-43: Teacher portal components
Week 44: Public pages & responsive design
