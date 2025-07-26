"use client"

import { useState } from "react"

export interface CareTeamMember {
  id: string
  name: string
  specialty: string
  role: string
  contact: {
    phone?: string
    email?: string
  }
  lastContact?: Date
  nextAppointment?: Date
}

export function useCareTeam() {
  const [careTeam, setCareTeam] = useState<CareTeamMember[]>([])

  const addMember = (member: Omit<CareTeamMember, "id">) => {
    const newMember: CareTeamMember = {
      ...member,
      id: Date.now().toString(),
    }
    setCareTeam((prev) => [...prev, newMember])
  }

  const removeMember = (id: string) => {
    setCareTeam((prev) => prev.filter((member) => member.id !== id))
  }

  const updateMember = (id: string, updates: Partial<CareTeamMember>) => {
    setCareTeam((prev) => prev.map((member) => (member.id === id ? { ...member, ...updates } : member)))
  }

  return {
    careTeam,
    addMember,
    removeMember,
    updateMember,
  }
}
