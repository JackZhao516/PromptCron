import React, { useState, useEffect } from 'react';
import { PromptSchedule } from './types';
import { api } from './services/api';
import ScheduleForm from './components/ScheduleForm';
import ScheduleList from './components/ScheduleList';
import toast from 'react-hot-toast';

function App() {
  const [schedules, setSchedules] = useState<PromptSchedule[]>([]);

  useEffect(() => {
    loadSchedules();
  }, []);

  const loadSchedules = async () => {
    try {
      const data = await api.getSchedules();
      setSchedules(data);
    } catch (error) {
      toast.error('Failed to load schedules');
      console.error('Error loading schedules:', error);
    }
  };

  const handleCreateSchedule = async (schedule: PromptSchedule) => {
    try {
      await api.createSchedule(schedule);
      toast.success('Schedule created successfully');
      loadSchedules();
    } catch (error) {
      toast.error('Failed to create schedule');
      console.error('Error creating schedule:', error);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    try {
      await api.deleteSchedule(id);
      toast.success('Schedule deleted successfully');
      setSchedules(schedules.filter(s => s.id !== id));
    } catch (error) {
      toast.error('Failed to delete schedule');
      console.error('Error deleting schedule:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">PromptCron</h1>
          <div className="bg-white shadow rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Create New Schedule</h2>
            <ScheduleForm onSubmit={handleCreateSchedule} />
          </div>
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Your Schedules</h2>
            <ScheduleList schedules={schedules} onDelete={handleDeleteSchedule} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App; 