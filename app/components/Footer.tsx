import Link from 'next/link';
import { Facebook, Mail, Phone } from 'lucide-react';

const Footer = () => {
  return (
    <footer className='bg-primary text-white py-8'>
      <div className='container mx-auto px-4'>
        <div className='flex flex-wrap justify-between'>
          <div className='w-full md:w-1/4 mb-6 md:mb-0'>
            <h3 className='text-2xl font-bold mb-4'>Ilithiyana Group</h3>
            <p>Registration Number: 2020/652431/07</p>
          </div>
          <div className='w-full md:w-1/4 mb-6 md:mb-0'>
            <h4 className='text-lg font-semibold mb-4'>Quick Links</h4>
            <ul className='space-y-2'>
              <li>
                <Link
                  href='/'
                  className='hover:text-secondary transition-colors'
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  href='/about'
                  className='hover:text-secondary transition-colors'
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  href='/academics'
                  className='hover:text-secondary transition-colors'
                >
                  Academics
                </Link>
              </li>
              <li>
                <Link
                  href='/vehicle-care'
                  className='hover:text-secondary transition-colors'
                >
                  Vehicle Care
                </Link>
              </li>
              <li>
                <Link
                  href='/infrastructure'
                  className='hover:text-secondary transition-colors'
                >
                  Infrastructure Services
                </Link>
              </li>
              <li>
                <Link
                  href='/contact'
                  className='hover:text-secondary transition-colors'
                >
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>
          <div className='w-full md:w-1/4 mb-6 md:mb-0'>
            <h4 className='text-lg font-semibold mb-4'>Contact Us</h4>
            <div className='space-y-2'>
              <p className='flex items-center'>
                <Mail className='mr-2' />
                <a
                  href='mailto:info@ilithiyana.co.za'
                  className='hover:text-secondary transition-colors'
                >
                  info@ilithiyana.co.za
                </a>
              </p>
              <p className='flex items-center'>
                <Phone className='mr-2' />
                <a
                  href='tel:0650310714'
                  className='hover:text-secondary transition-colors'
                >
                  065 031 0714
                </a>
              </p>
            </div>
          </div>
          <div className='w-full md:w-1/4'>
            <h4 className='text-lg font-semibold mb-4'>Follow Us</h4>
            <div className='flex space-x-4'>
              <a href='#' className='hover:text-secondary transition-colors'>
                <Facebook />
              </a>
            </div>
          </div>
        </div>
        <div className='mt-8 text-center'>
          <p>
            &copy; {new Date().getFullYear()} Ilithiyana (Pty) Ltd. All rights
            reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
