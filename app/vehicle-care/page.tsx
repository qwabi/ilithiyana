import VehicleCareForm from "../components/VehicleCareForm"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function VehicleCare() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-4xl font-bold mb-8">Vehicle Care Division</h1>
      <p className="text-xl mb-8">
        Our mobile car wash service is tailored for fleet management, providing convenient and professional cleaning for
        your vehicles.
      </p>

      <h2 className="text-3xl font-bold mb-4">Benefits for Fleet Owners</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Time Savings</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Our mobile service comes to you, saving valuable time for your fleet operations.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Professional Service</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Experienced staff and high-quality cleaning products ensure top-notch results.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Scalability</CardTitle>
          </CardHeader>
          <CardContent>
            <p>We can handle fleets of any size, adapting our service to your specific needs.</p>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-3xl font-bold mb-4">Sign Up for Fleet Car Wash Service</h2>
      <VehicleCareForm />
    </div>
  )
}

