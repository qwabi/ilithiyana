import AcademicsForm from "../components/AcademicsForm"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Image from "next/image"
import { CheckCircle } from "lucide-react"

export default function Academics() {
  const subjects = ["Mathematics", "Natural Science", "Life Sciences", "English", "Physical Science"]

  const packages = [
    {
      name: "Package A",
      price: "R1000/month",
      features: [
        "Four (4) hours of personalized Career Guidance",
        "Eight (8) hours of lessons for any of the offered subjects",
      ],
    },
    {
      name: "Package B",
      price: "R175/lesson",
      features: ["Four (4) hours of personalized Career Guidance", "Each lesson is one (1) hour"],
    },
  ]

  return (
    <div className="container mx-auto py-8">
      <div className="grid md:grid-cols-2 gap-8 items-center mb-12">
        <div>
          <h1 className="text-4xl font-bold mb-4">Academic Excellence</h1>
          <p className="text-xl mb-6">
            Ilithiyana is offering online tutoring for Pure Maths, Natural Sciences, Life Sciences, English, and
            Physical Science. We Cater for Grade 8 till Grade 12.
          </p>
          <div className="space-y-2">
            {subjects.map((subject) => (
              <div key={subject} className="flex items-center space-x-2">
                <CheckCircle className="text-accent" />
                <span>{subject}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="relative h-[400px]">
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/WhatsApp%20Image%202025-01-23%20at%2014.16.16-AHYwRIwl3epwcchsjGvCAgxKQXXDZn.jpeg"
            alt="World of possibilities"
            fill
            className="object-cover rounded-lg"
          />
        </div>
      </div>

      <h2 className="text-3xl font-bold mb-6">Our Packages</h2>
      <div className="grid md:grid-cols-2 gap-8 mb-12">
        {packages.map((pkg) => (
          <Card key={pkg.name} className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-accent transform rotate-45 translate-x-8 -translate-y-8" />
            <CardHeader>
              <CardTitle className="text-2xl">
                {pkg.name}
                <span className="block text-xl font-normal text-muted-foreground">{pkg.price}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {pkg.features.map((feature) => (
                  <li key={feature} className="flex items-center space-x-2">
                    <CheckCircle className="text-accent" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="bg-muted p-8 rounded-lg mb-12">
        <h2 className="text-3xl font-bold mb-4">Session Information</h2>
        <p className="text-lg mb-4">
          1 hour per session, four sessions per month. Day and times are decided by the learner depending on the school
          schedule.
        </p>
        <div className="flex items-center space-x-4">
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/WhatsApp%20Image%202025-01-23%20at%2014.16.17-0nuRJJNbmYbuoH0NqWzZiiGK05rnnr.jpeg"
            alt="Admission Open"
            width={300}
            height={200}
            className="rounded-lg"
          />
        </div>
      </div>

      <h2 className="text-3xl font-bold mb-6">Apply for Tutoring</h2>
      <AcademicsForm />
    </div>
  )
}

