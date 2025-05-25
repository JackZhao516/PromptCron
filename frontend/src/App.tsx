import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import ScheduleForm from './components/ScheduleForm';
import ScheduleList from './components/ScheduleList';
import { PromptSchedule } from './types';

function App() {
  const [schedules, setSchedules] = useState<PromptSchedule[]>([]);

  const addSchedule = (schedule: PromptSchedule) => {
    setSchedules([...schedules, schedule]);
  };

  const deleteSchedule = (id: string) => {
    setSchedules(schedules.filter(schedule => schedule.id !== id));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">PromptCron</h1>
          <p className="text-lg text-gray-600 mb-8">Schedule AI prompts to be delivered to your email</p>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <ScheduleForm onSubmit={addSchedule} />
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Your Scheduled Prompts</h2>
          <ScheduleList schedules={schedules} onDelete={deleteSchedule} />
        </div>
      </div>
    </div>
  );
}

export default App; 