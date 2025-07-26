"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Plus, Phone, Mail, Calendar, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useCareTeam } from "@/hooks/use-care-team"

interface CareTeamPanelProps {
  onClose: () => void
}

export function CareTeamPanel({ onClose }: CareTeamPanelProps) {
  const { careTeam, addMember, removeMember } = useCareTeam()
  const [showAddForm, setShowAddForm] = useState(false)
  const [newMember, setNewMember] = useState({
    name: "",
    specialty: "",
    role: "",
    phone: "",
    email: "",
  })

  const handleAddMember = () => {
    if (newMember.name && newMember.specialty) {
      addMember({
        ...newMember,
        contact: {
          phone: newMember.phone,
          email: newMember.email,
        },
      })
      setNewMember({ name: "", specialty: "", role: "", phone: "", email: "" })
      setShowAddForm(false)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-card rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-2xl font-bold">Care Team</h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="p-6 space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-muted-foreground">Manage your healthcare providers</p>
              <Button onClick={() => setShowAddForm(!showAddForm)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Member
              </Button>
            </div>

            {showAddForm && (
              <Card>
                <CardHeader>
                  <CardTitle>Add Care Team Member</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        value={newMember.name}
                        onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                        placeholder="Dr. Smith"
                      />
                    </div>
                    <div>
                      <Label htmlFor="specialty">Specialty</Label>
                      <Input
                        id="specialty"
                        value={newMember.specialty}
                        onChange={(e) => setNewMember({ ...newMember, specialty: e.target.value })}
                        placeholder="Cardiology"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="role">Role</Label>
                    <Input
                      id="role"
                      value={newMember.role}
                      onChange={(e) => setNewMember({ ...newMember, role: e.target.value })}
                      placeholder="Primary Care Physician"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={newMember.phone}
                        onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
                        placeholder="(555) 123-4567"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        value={newMember.email}
                        onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                        placeholder="doctor@clinic.com"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleAddMember}>Add Member</Button>
                    <Button variant="outline" onClick={() => setShowAddForm(false)}>
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-4">
              {careTeam.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No care team members added yet</p>
                </div>
              ) : (
                careTeam.map((member) => (
                  <Card key={member.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold">{member.name}</h4>
                          <p className="text-sm text-muted-foreground">{member.specialty}</p>
                          <p className="text-xs text-muted-foreground">{member.role}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {member.contact.phone && (
                            <Button variant="ghost" size="icon">
                              <Phone className="w-4 h-4" />
                            </Button>
                          )}
                          {member.contact.email && (
                            <Button variant="ghost" size="icon">
                              <Mail className="w-4 h-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon">
                            <Calendar className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => removeMember(member.id)}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
