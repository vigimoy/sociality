"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { api, imageError, safeReturnTo } from "@/lib/sociality/api";
import { profileChanges, optionalPhone } from "@/lib/sociality/payloads";
import { useResource, useSession } from "@/lib/sociality/query";
import { useAppDispatch, setSession } from "@/lib/sociality/store";
import type { Session, User, Post } from "@/lib/sociality/types";
import {
  Icon,
  Brand,
  Avatar,
  Shell,
  AuthGuard,
  PageHeading,
  Loading,
  ErrorState,
} from "./common";
const email = z.string().trim().email("Enter a valid email address.");
const password = z.string().min(6, "Use at least 6 characters.");
const loginSchema = z.object({ email, password });
const registerSchema = z
  .object({
    name: z.string().trim().min(1, "Enter your name.").max(100),
    username: z
      .string()
      .trim()
      .min(3, "Use at least 3 characters.")
      .max(30)
      .regex(/^[a-zA-Z0-9_.]+$/, "Use letters, numbers, dots, or underscores."),
    email,
    phone: z.string().trim(),
    password,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });
function Field({
  label,
  id,
  error,
  children,
}: {
  label: string;
  id: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
      {error && (
        <p className="field-error" id={id + "-error"} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
function AuthBackground() {
  return (
    <div className="auth-art" aria-hidden="true">
      <div className="auth-gradient">
        <img className="gradient-one" src="/design/bdac9.svg" alt="" />
        <div className="gradient-two-wrap">
          <img className="gradient-two" src="/design/bf16f.svg" alt="" />
        </div>
      </div>
    </div>
  );
}
export function AuthForm({ register = false }: { register?: boolean }) {
  const router = useRouter();
  const search = useSearchParams();
  const dispatch = useAppDispatch();
  const client = useQueryClient();
  const [visible, setVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const lock = useRef(false);
  const [serverError, setServerError] = useState("");
  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(
      register
        ? registerSchema
        : loginSchema.extend({
            name: z.string(),
            username: z.string(),
            phone: z.string(),
            confirmPassword: z.string(),
          }),
    ),
    defaultValues: {
      name: "",
      username: "",
      phone: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });
  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof registerSchema>) => {
      const { name, username, email, password, phone } = values;
      const body = { name, username, email, password };
      return api<Session>(register ? "/api/auth/register" : "/api/auth/login", {
        method: "POST",
        body: register
          ? { ...body, ...optionalPhone(phone) }
          : { email: values.email, password: values.password },
      });
    },
    onSuccess: (data) => {
      client.clear();
      dispatch(setSession(data));
      toast.success(
        register
          ? "Your account is ready. Welcome to Sociality!"
          : "Welcome back!",
      );
      router.replace(safeReturnTo(search.get("returnTo")));
    },
    onError: (e) => setServerError(e.message),
    onSettled: () => {
      lock.current = false;
    },
  });
  const fields = register
    ? [
        ["name", "Name", "Enter your name", "text"],
        ["username", "Username", "Enter your username", "text"],
        ["email", "Email", "Enter your email", "email"],
        ["phone", "Phone number (optional)", "Enter your phone number", "tel"],
        ["password", "Password", "Enter your password", "password"],
        [
          "confirmPassword",
          "Confirm Password",
          "Confirm your password",
          "password",
        ],
      ]
    : [
        ["email", "Email", "Enter your email", "email"],
        ["password", "Password", "Enter your password", "password"],
      ];
  return (
    <main className="auth-page">
      <AuthBackground />
      <section className={"auth-card " + (register ? "register-card" : "")}>
        <Brand />
        <h1>{register ? "Register" : "Welcome Back!"}</h1>
        <form
          noValidate
          onSubmit={(event) => form.handleSubmit((values) => {
            if (lock.current) return;
            lock.current = true;
            setServerError("");
            mutation.mutate(values);
          })(event)}
        >
          {fields.map(([key, label, placeholder, type]) => {
            const name = key as keyof z.infer<typeof registerSchema>;
            const show = name === "confirmPassword" ? confirmVisible : visible;
            const err = form.formState.errors[name]?.message;
            return (
              <Field key={name} id={name} label={label} error={err}>
                <div className="password-field">
                  <Input
                    id={name}
                    type={type === "password" && show ? "text" : type}
                    placeholder={placeholder}
                    autoComplete={
                      name === "confirmPassword"
                        ? "new-password"
                        : name === "password"
                          ? register
                            ? "new-password"
                            : "current-password"
                          : name === "name"
                            ? "name"
                            : name === "phone"
                              ? "tel"
                              : name
                    }
                    {...form.register(name)}
                    aria-invalid={!!err}
                    aria-describedby={err ? name + "-error" : undefined}
                  />
                  {type === "password" && (
                    <button
                      type="button"
                      className="password-toggle"
                      aria-label={show ? "Hide password" : "Show password"}
                      aria-pressed={show}
                      onClick={() =>
                        name === "confirmPassword"
                          ? setConfirmVisible(!show)
                          : setVisible(!show)
                      }
                    >
                      <Icon name="eye" />
                    </button>
                  )}
                </div>
              </Field>
            );
          })}
          {serverError && (
            <p className="form-error" role="alert">
              {serverError}
            </p>
          )}
          <Button
            className="pill submit-button"
            disabled={mutation.isPending}
            type="submit"
          >
            {mutation.isPending
              ? "Please wait…"
              : register
                ? "Submit"
                : "Login"}
          </Button>
          <p className="auth-switch">
            {register ? "Already have an account?" : "Don’t have an account?"}{" "}
            <Link
              href={
                (register ? "/login" : "/register") +
                (search.get("returnTo")
                  ? "?returnTo=" + encodeURIComponent(search.get("returnTo")!)
                  : "")
              }
            >
              {register ? "Log in" : "Register"}
            </Link>
          </p>
        </form>
      </section>
    </main>
  );
}
function Upload({
  setFile,
  error,
}: {
  file?: File;
  setFile: (file?: File) => void;
  error?: string;
}) {
  const [url, setUrl] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  const updateFile = (next?: File) => {
    setFile(next);
    setUrl(next ? URL.createObjectURL(next) : "");
  };
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  return (
    <div>
      <input
        type="file"
        ref={ref}
        id="photo"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        onChange={(e) => updateFile(e.target.files?.[0])}
      />
      {url ? (
        <div className="upload-preview">
          <img src={url} alt="Photo preview" />
          <div>
            <Button
              type="button"
              className="pill"
              variant="outline"
              onClick={() => ref.current?.click()}
            >
              Change photo
            </Button>
            <Button
              type="button"
              className="pill"
              variant="outline"
              onClick={() => {
                updateFile(undefined);
                if (ref.current) ref.current.value = "";
              }}
            >
              Remove photo
            </Button>
          </div>
        </div>
      ) : (
        <button
          className="upload-zone"
          type="button"
          onClick={() => ref.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            updateFile(e.dataTransfer.files[0]);
          }}
        >
          <span className="upload-icon">
            <Icon name="upload" />
          </span>
          <span>
            <strong>Click to upload</strong> or drag and drop
          </span>
          <span>PNG, JPG or WebP (max. 5 MB)</span>
        </button>
      )}
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
const postSchema = z.object({
  caption: z.string().max(2200, "Use 2,200 characters or fewer."),
});
export function CreatePost() {
  return (
    <AuthGuard>
      <CreatePostForm />
    </AuthGuard>
  );
}
function CreatePostForm() {
  const { session } = useSession();
  const router = useRouter();
  const client = useQueryClient();
  const [file, setFile] = useState<File>();
  const [fileError, setFileError] = useState<string>();
  const lock = useRef(false);
  const form = useForm<z.infer<typeof postSchema>>({
    resolver: zodResolver(postSchema),
    defaultValues: { caption: "" },
  });
  const mutation = useMutation({
    mutationFn: (caption: string) => {
      const data = new FormData();
      data.append("image", file!);
      data.append("caption", caption);
      return api<Post>("/api/posts", {
        method: "POST",
        token: session?.token,
        body: data,
      });
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["api"] });
      toast.success("Post shared successfully.");
      router.push("/me");
    },
    onError: (e) => toast.error(e.message),
    onSettled: () => {
      lock.current = false;
    },
  });
  return (
    <Shell title="Add Post" back nav={false}>
      <div className="create-container">
        <PageHeading href="/feed">Add Post</PageHeading>
        <form
          noValidate
          onSubmit={(event) => form.handleSubmit(({ caption }) => {
            const error = imageError(file);
            setFileError(error);
            if (error || lock.current) return;
            lock.current = true;
            mutation.mutate(caption);
          })(event)}
        >
          <Field id="photo" label="Photo">
            <Upload
              file={file}
              setFile={(f) => {
                const e = f ? imageError(f) : undefined;
                setFileError(e);
                setFile(e ? undefined : f);
              }}
              error={fileError}
            />
          </Field>
          <Field
            id="caption"
            label="Caption"
            error={form.formState.errors.caption?.message}
          >
            <Textarea
              id="caption"
              placeholder="Create your caption"
              {...form.register("caption")}
              maxLength={2200}
            />
          </Field>
          {mutation.isError && (
            <p className="form-error" role="alert">
              {mutation.error.message}
            </p>
          )}
          <Button
            type="submit"
            className="pill submit-button"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Sharing…" : "Share"}
          </Button>
        </form>
      </div>
    </Shell>
  );
}
const profileSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(100),
  username: z
    .string()
    .trim()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_.]+$/, "Use letters, numbers, dots, or underscores."),
  phone: z.string(),
  bio: z.string().max(500, "Use 500 characters or fewer."),
});
export type MeResponse = {
  profile: User;
  stats: { posts: number; followers: number; following: number; likes: number };
};
export function EditProfile() {
  return (
    <AuthGuard>
      <EditLoader />
    </AuthGuard>
  );
}
function EditLoader() {
  const query = useResource<MeResponse>("/api/me");
  return (
    <Shell title="Edit Profile" back nav={false}>
      <div className="edit-container">
        <PageHeading href="/me">Edit Profile</PageHeading>
        {query.isPending ? (
          <Loading />
        ) : query.isError ? (
          <ErrorState error={query.error} retry={() => query.refetch()} />
        ) : (
          <EditForm user={query.data.profile} />
        )}
      </div>
    </Shell>
  );
}
function EditForm({ user }: { user: User }) {
  const { session } = useSession();
  const dispatch = useAppDispatch();
  const client = useQueryClient();
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [avatar, setAvatar] = useState<File>();
  const [preview, setPreview] = useState("");
  const [fileError, setFileError] = useState("");
  const lock = useRef(false);
  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(
      profileSchema.refine((v) => !user.phone || v.phone.trim().length > 0, {
        path: ["phone"],
        message: "Enter a phone number or keep your current number.",
      }),
    ),
    defaultValues: {
      name: user.name,
      username: user.username,
      phone: user.phone || "",
      bio: user.bio || "",
    },
  });
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  const mutation = useMutation({
    mutationFn: async (values: z.infer<typeof profileSchema>) => {
      const data = new FormData();
      const changes = profileChanges(values, user);
      Object.entries(changes).forEach(([k, v]) => data.append(k, v));
      if (avatar) data.append("avatar", avatar);
      if (Object.keys(changes).length || avatar)
        await api("/api/me", {
          token: session?.token,
          method: "PATCH",
          body: data,
        });
      return api<MeResponse>("/api/me", { token: session?.token });
    },
    onSuccess: async (data) => {
      dispatch(setSession({ ...session!, user: data.profile }));
      await client.invalidateQueries({ queryKey: ["api"] });
      toast.success("Profile updated.");
      router.push("/me");
    },
    onError: (e) => toast.error(e.message),
    onSettled: () => {
      lock.current = false;
    },
  });
  return (
    <form
      className="edit-layout"
      noValidate
      onSubmit={(event) => form.handleSubmit((v) => {
        if (lock.current || fileError) return;
        lock.current = true;
        mutation.mutate(v);
      })(event)}
    >
      <div className="edit-avatar">
        <Avatar
          user={{ ...user, avatarUrl: preview || user.avatarUrl }}
          size={130}
        />
        <input
          ref={input}
          type="file"
          className="sr-only"
          aria-label="Upload profile photo"
          accept="image/png,image/jpeg,image/webp"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const error = imageError(f);
            setFileError(error || "");
            if (!error) {
              setAvatar(f);
              setPreview(URL.createObjectURL(f));
            }
          }}
        />
        <Button
          className="pill"
          variant="outline"
          type="button"
          onClick={() => input.current?.click()}
        >
          Change Photo
        </Button>
        {fileError && (
          <p className="field-error" role="alert">
            {fileError}
          </p>
        )}
      </div>
      <div className="edit-fields">
        {(["name", "username"] as const).map((name) => (
          <Field
            key={name}
            id={name}
            label={name === "name" ? "Name" : "Username"}
            error={form.formState.errors[name]?.message}
          >
            <Input
              id={name}
              {...form.register(name)}
              aria-invalid={!!form.formState.errors[name]}
            />
          </Field>
        ))}
        <Field id="email" label="Email">
          <Input
            id="email"
            value={user.email || ""}
            readOnly
            aria-describedby="email-help"
          />
          <p id="email-help" className="field-hint">
            Your sign-in email cannot be changed here.
          </p>
        </Field>
        <Field
          id="phone"
          label="Phone number"
          error={form.formState.errors.phone?.message}
        >
          <Input id="phone" type="tel" {...form.register("phone")} />
        </Field>
        <Field id="bio" label="Bio" error={form.formState.errors.bio?.message}>
          <Textarea id="bio" {...form.register("bio")} maxLength={500} />
        </Field>
        {mutation.isError && (
          <p className="form-error" role="alert">
            {mutation.error.message}
          </p>
        )}
        <Button
          type="submit"
          className="pill submit-button"
          disabled={mutation.isPending}
        >
          {mutation.isPending ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
