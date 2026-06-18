# LanceFy

LanceFy is a full-stack freelance marketplace platform built as a team graduation project.

The platform supports job posting, project management, freelancer workflows, KYC verification, admin moderation, and dispute management.

This repository contains both the frontend and backend applications.

## Project Overview

LanceFy is designed for clients and freelancers to manage freelance work in one platform.

Users can create jobs, submit proposals, manage projects, verify their identity, communicate through messaging, and handle disputes.

The system also includes an admin dashboard for user management, KYC review, community moderation, and dispute resolution.

## Tech Stack

### Frontend

* React
* TypeScript
* Vite
* Tailwind CSS
* React Router
* i18next

### Backend

* FastAPI
* PostgreSQL
* SQLAlchemy
* Alembic
* MinIO
* Keycloak
* Docker

## Main Features

### User Features

* User authentication
* Job posting
* Project management
* Freelancer profile
* Portfolio management
* Proposal workflow
* Messaging system
* Payment-related workflow
* Review system

### Verification & Security

* KYC verification
* Account verification
* Role-based access
* Protected routes
* Audit and activity logs

### Admin Features

* Admin dashboard
* User management
* KYC review
* Community moderation
* Dispute management
* Report and review workflow

## Project Structure

```txt
lancefy/
├── lancefy-backend/      # FastAPI backend application
├── lancefy-frontend/     # React frontend application
└── README.md             # Project overview
```

## Getting Started

Each application has its own setup instructions.

Backend setup:

```txt
lancefy-backend/README.md
```

Frontend setup:

```txt
lancefy-frontend/README.md
```

## Environment Variables

This project uses environment variables for local configuration.

Example files are included:

```txt
lancefy-backend/.env.example
lancefy-frontend/.env.example
```

Create your own `.env` files based on the example files.

Do not commit real `.env` files or secrets to GitHub.

## Screenshots

Screenshots will be added to demonstrate the main user and admin workflows.

## Project Status

This project is currently presented as a portfolio and code showcase.

The full local setup requires multiple services, including the frontend application, backend API, PostgreSQL database, Keycloak authentication server, and object storage.

## Notes

This project was originally developed as a team graduation project.

This repository is a cleaned and organized version for portfolio and learning purposes.

## What I Learned

* Building a full-stack application structure
* Working with frontend and backend integration
* Designing admin workflows
* Handling authentication and role-based access
* Managing project features across multiple user roles
* Organizing and cleaning a large team project for GitHub
