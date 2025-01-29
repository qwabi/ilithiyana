import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function About() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-4xl font-bold mb-8">About Ilithiyana Consulting</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <p className="text-lg mb-4">
            Ilithiyana Consulting is a 100% black-owned enterprise committed to contributing to South Africa's economic
            growth and community development. Founded by Masande Dudula, we specialize in Academics, Vehicle Care,
            Infrastructure Services, and Community Foundations.
          </p>
          <p className="text-lg mb-4">
            Our mission is to deliver excellence, create opportunities, and drive social impact across various sectors
            of the South African economy.
          </p>
          <p className="text-lg mb-4">
            Our core values of honesty, reliability, and integrity guide every aspect of our operations, ensuring that
            we consistently deliver high-quality services to our clients and partners.
          </p>
        </div>
        <div>
          <Image
            src="/placeholder.svg"
            alt="Ilithiyana Consulting Office"
            width={600}
            height={400}
            className="rounded-lg shadow-lg"
          />
        </div>
      </div>

      <h2 className="text-3xl font-bold mt-12 mb-6">Our Founder</h2>
      <Card>
        <CardHeader>
          <CardTitle>Masande Dudula</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center space-x-6">
          <Image src="/placeholder.svg" alt="Masande Dudula" width={200} height={200} className="rounded-full" />
          <div>
            <p className="mb-4">
              Masande Dudula is the visionary founder of Ilithiyana Consulting. With extensive experience in various
              industries, Masande has dedicated his career to creating opportunities for growth and development in South
              Africa.
            </p>
            <p>
              His leadership and commitment to excellence have been instrumental in establishing Ilithiyana Consulting
              as a trusted name in academics, vehicle care, and infrastructure services.
            </p>
          </div>
        </CardContent>
      </Card>

      <h2 className="text-3xl font-bold mt-12 mb-6">Our Commitment</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quality Service</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              We are committed to delivering the highest quality services across all our divisions, ensuring customer
              satisfaction and excellence in every project we undertake.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Community Development</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              Our focus on community foundations reflects our dedication to uplifting and empowering local communities
              through various initiatives and programs.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Innovation</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              We continuously strive to innovate and improve our services, embracing new technologies and methodologies
              to better serve our clients and contribute to South Africa's progress.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

