"use client"

import { motion } from "framer-motion"
import { ArrowRight, Bot, Heart, Shield, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export function RonAILanding() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="w-8 h-8 text-primary" />
            </div>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
            Your Health Advocacy{" "}
            <span className="text-primary bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Co-Pilot
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Get clarity and confidence in your healthcare decisions with AI-powered insights, expert recommendations,
            and seamless care coordination.
          </p>
          <Link href="/">
            <Button size="lg" className="text-lg px-8 py-4">
              Get Started
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid md:grid-cols-3 gap-8 mb-16"
        >
          <Card>
            <CardHeader>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Heart className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Provider Search</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Find healthcare providers that align with your needs and values using AI-powered matching.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Medication Management</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Track medications, find cost savings, and manage refills with intelligent automation.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Care Coordination</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Seamlessly coordinate with your care team and manage appointments with AI assistance.
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-center"
        >
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-8">
              <h2 className="text-3xl font-bold mb-4">Ready to take control of your healthcare?</h2>
              <p className="text-muted-foreground mb-6">
                Join thousands of users who trust Ron AI to navigate their healthcare journey.
              </p>
              <Link href="/">
                <Button size="lg" className="text-lg px-8 py-4">
                  Start Your Journey
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
