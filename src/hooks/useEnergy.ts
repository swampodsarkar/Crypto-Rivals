import { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { db, ref, update } from '../firebase/config';

export const MAX_ENERGY = 5;
export const ENERGY_REFILL_TIME_MS = 5 * 60 * 1000; // 5 minutes

export function useEnergy() {
  const { user } = useAppStore();
  const [currentEnergy, setCurrentEnergy] = useState(0);
  const [timeUntilNext, setTimeUntilNext] = useState(0);

  useEffect(() => {
    if (!user) return;

    const calculateEnergy = () => {
      // Fallback for existing users without energy fields
      const userEnergy = user.energy ?? MAX_ENERGY;
      const lastUpdate = user.lastEnergyUpdate ?? Date.now();

      if (userEnergy >= MAX_ENERGY) {
        setCurrentEnergy(MAX_ENERGY);
        setTimeUntilNext(0);
        return;
      }

      const now = Date.now();
      const timePassed = now - lastUpdate;
      const energyToRestore = Math.floor(timePassed / ENERGY_REFILL_TIME_MS);
      
      const newEnergy = Math.min(MAX_ENERGY, userEnergy + energyToRestore);
      
      setCurrentEnergy(newEnergy);

      if (newEnergy < MAX_ENERGY) {
        const timeToNext = ENERGY_REFILL_TIME_MS - (timePassed % ENERGY_REFILL_TIME_MS);
        setTimeUntilNext(timeToNext);
      } else {
        setTimeUntilNext(0);
      }

      // If we restored energy, update the database
      if (energyToRestore > 0 && newEnergy !== userEnergy) {
        const newLastUpdate = lastUpdate + (energyToRestore * ENERGY_REFILL_TIME_MS);
        update(ref(db, `users/${user.uid}`), {
          energy: newEnergy,
          lastEnergyUpdate: newLastUpdate
        }).catch(console.error);
      }
    };

    calculateEnergy();
    const interval = setInterval(calculateEnergy, 1000);

    return () => clearInterval(interval);
  }, [user]);

  const consumeEnergy = async () => {
    if (!user || currentEnergy <= 0) return false;

    const newEnergy = currentEnergy - 1;
    // If we are at max energy, the refill timer starts now
    const newLastUpdate = currentEnergy === MAX_ENERGY ? Date.now() : user.lastEnergyUpdate;

    try {
      await update(ref(db, `users/${user.uid}`), {
        energy: newEnergy,
        lastEnergyUpdate: newLastUpdate
      });
      return true;
    } catch (error) {
      console.error("Failed to consume energy:", error);
      return false;
    }
  };

  return { currentEnergy, timeUntilNext, consumeEnergy };
}
