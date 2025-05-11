import SignupForm from '@/components/auth/signup-form';

export const metadata = {
  title: 'Sign Up - Potoba',
  description: 'Create an account to access Potoba',
  keywords: 'signup, register, create account, Potoba',
  author: 'Potoba Team',
};

export default function SignupPage() {
  return <SignupForm />;
}
