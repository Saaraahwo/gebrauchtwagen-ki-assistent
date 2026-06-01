import { describe, it, expect, beforeEach } from 'vitest';
import { addBooking, getBookings, _resetBookings } from './store';

describe('bookings store', () => {
  beforeEach(() => { _resetBookings(); });

  it('stores and returns a booking with a timestamp', () => {
    addBooking({ carId: 1, carName: 'BMW 320i', name: 'Max Mustermann', phone: '0151 1234', preferredDate: '2026-06-10' });
    const all = getBookings();
    expect(all).toHaveLength(1);
    expect(all[0].name).toBe('Max Mustermann');
    expect(all[0].carId).toBe(1);
    expect(all[0].ts).toBeTruthy();
  });

  it('returns newest first', () => {
    addBooking({ carId: 1, carName: 'A', name: 'Erst', phone: '1', preferredDate: 'x' });
    addBooking({ carId: 2, carName: 'B', name: 'Zweit', phone: '2', preferredDate: 'y' });
    expect(getBookings()[0].name).toBe('Zweit');
  });
});
