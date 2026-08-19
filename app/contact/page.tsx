"use client";

import { FormEvent, useState } from "react";

export default function ContactPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");
    setSuccess(false);

    const form = event.currentTarget;
    const formData = new FormData(form);

    const payload = {
      name: String(formData.get("name") || "").trim(),
      phone: String(formData.get("phone") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      service: String(formData.get("service") || "").trim(),
      message: String(formData.get("message") || "").trim(),
    };

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong.");
      }

      setSuccess(true);
      form.reset();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to submit your enquiry."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-5xl">
        <section className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-400">
            Rahul Fitness
          </p>

          <h1 className="mt-4 text-5xl font-bold">
            Get the right training plan for your goals.
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-400">
            Tell us what you're looking for and our team will get
            back to you.
          </p>
        </section>

        <section className="mx-auto mt-12 max-w-2xl rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
          <h2 className="text-2xl font-bold">
            Get started
          </h2>

          <p className="mt-2 text-slate-400">
            Takes less than a minute.
          </p>

          <form
            onSubmit={handleSubmit}
            className="mt-8 space-y-5"
          >
            <input
              name="name"
              required
              placeholder="Your name"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
            />

            <input
              name="phone"
              required
              placeholder="Phone number"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
            />

            <input
              name="email"
              type="email"
              required
              placeholder="Email address"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
            />

            <select
              name="service"
              required
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
              defaultValue=""
            >
              <option value="" disabled>
                What are you interested in?
              </option>
              <option value="Weight Loss">
                Weight Loss
              </option>
              <option value="Personal Training">
                Personal Training
              </option>
              <option value="Muscle Building">
                Muscle Building
              </option>
              <option value="General Fitness">
                General Fitness
              </option>
            </select>

            <textarea
              name="message"
              rows={5}
              required
              placeholder="Tell us about your goals..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Sending..."
                : "Get Started"}
            </button>
          </form>

          {success && (
            <div className="mt-5 rounded-xl bg-emerald-500/10 p-4 text-emerald-300">
              Thanks! Your enquiry has been received.
            </div>
          )}

          {error && (
            <div className="mt-5 rounded-xl bg-red-500/10 p-4 text-red-300">
              {error}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}