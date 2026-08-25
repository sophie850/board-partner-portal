import { redirect } from 'next/navigation';

/**
 * No authentication yet, so the root goes straight to the organiser
 * portal. When magic links land this becomes the sign-in screen, and
 * routes here by role.
 */
export default function Home() {
  redirect('/organiser');
}
