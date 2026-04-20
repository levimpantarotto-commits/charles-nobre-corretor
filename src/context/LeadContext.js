'use client';
import { createContext, useContext, useState } from 'react';

const LeadContext = createContext();

export function LeadProvider({ children }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [propertyTitle, setPropertyTitle] = useState(null);

  const openLeadModal = (title = null) => {
    setPropertyTitle(title);
    setIsModalOpen(true);
  };

  const closeLeadModal = () => {
    setIsModalOpen(false);
    setPropertyTitle(null);
  };

  return (
    <LeadContext.Provider value={{ isModalOpen, propertyTitle, openLeadModal, closeLeadModal }}>
      {children}
    </LeadContext.Provider>
  );
}

export const useLead = () => useContext(LeadContext);
