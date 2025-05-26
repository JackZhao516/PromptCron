import { PromptSchedule } from '../types';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const handleResponse = async (response: Response) => {
  try {
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'An error occurred');
    }
    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to process response');
  }
};

export const api = {
  async getSchedules(): Promise<PromptSchedule[]> {
    try {
      const response = await fetch(`${API_URL}/schedules`);
      return handleResponse(response);
    } catch (error) {
      console.error('Failed to fetch schedules:', error);
      throw error;
    }
  },

  async createSchedule(schedule: Omit<PromptSchedule, 'id'> & { id: string }): Promise<PromptSchedule> {
    try {
      const response = await fetch(`${API_URL}/schedules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(schedule),
      });
      return handleResponse(response);
    } catch (error) {
      console.error('Failed to create schedule:', error);
      throw error;
    }
  },

  async deleteSchedule(id: string): Promise<void> {
    try {
      const response = await fetch(`${API_URL}/schedules/${id}`, {
        method: 'DELETE',
      });
      return handleResponse(response);
    } catch (error) {
      console.error('Failed to delete schedule:', error);
      throw error;
    }
  },
}; 