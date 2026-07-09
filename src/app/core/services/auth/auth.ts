import { Injectable } from '@angular/core';
import { Supabase } from '../supabase/supabase';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  constructor(private supabase: Supabase) {}

  async signUp(email: string, password: string) {
    const { data, error } = await this.supabase.client.auth.signUp({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    return data;
  }

  async signIn(email: string, password: string) {
    const { data, error } = await this.supabase.client.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    return data;
  }

  async signOut() {
    const { error } = await this.supabase.client.auth.signOut();

    if (error) {
      throw error;
    }
  }

  async getUser() {
    const { data, error } = await this.supabase.client.auth.getUser();

    if (error || !data.user) {
      return null;
    }

    return data.user;
  }

  async getSession() {
    const { data, error } = await this.supabase.client.auth.getSession();

    if (error) {
      throw error;
    }

    return data.session;
  }

  onAuthStateChange(callback: () => void) {
    return this.supabase.client.auth.onAuthStateChange(() => {
      callback();
    });
  }
}
