import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import InfrastructureForm from "../components/InfrastructureForm"

export default function Infrastructure() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-4xl font-bold mb-8">Infrastructure Services</h1>
      <p className="text-xl mb-8">
        Ilithiyana Group offers comprehensive infrastructure services including civil engineering, project management,
        water infrastructure, and SMME development.
      </p>

      <h2 className="text-3xl font-bold mb-4">Our Services</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Civil & Structural Engineering</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Specializing in kerbing, paving, and roadworks.</p>
            <Button asChild className="mt-4">
              <Link href="/infrastructure/civil-engineering">Learn More</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Project Management</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Expertise in bills of quantities and safety file documentation.</p>
            <Button asChild className="mt-4">
              <Link href="/infrastructure/project-management">Learn More</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Water Infrastructure</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Specializing in piping and sanitation projects.</p>
            <Button asChild className="mt-4">
              <Link href="/infrastructure/water">Learn More</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>SMME Development & Training</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Supporting small businesses in the infrastructure sector.</p>
            <Button asChild className="mt-4">
              <Link href="/infrastructure/smme">Learn More</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-3xl font-bold mb-4">Book a Consultation</h2>
      <InfrastructureForm />
    </div>
  )
}

