# PromptCron Frontend

This is the frontend application for PromptCron, a service that allows users to schedule AI prompts to be sent to their email.

## Features

- Schedule AI prompts to be sent daily, weekly, or on specific days
- Set custom times for each scheduled prompt
- View all currently scheduled prompts
- Modern, responsive UI built with React and Tailwind CSS

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

The application will be available at http://localhost:3000.

## Project Structure

- `src/components/` - React components
  - `ScheduleForm.tsx` - Form for creating new schedules
  - `ScheduleList.tsx` - Display list of current schedules
- `src/types.ts` - TypeScript type definitions
- `src/App.tsx` - Main application component
- `src/index.tsx` - Application entry point

## Technologies Used

- React
- TypeScript
- Tailwind CSS
- date-fns
- react-hot-toast 