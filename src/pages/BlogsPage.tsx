import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import usePageTitle from "@/hooks/usePageTitle";
import { BLOG_POSTS } from "@/data/blogs";

export default function BlogsPage() {
  usePageTitle("GenPay | Blogs");

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="container mx-auto px-4 pt-28 pb-16">
        <div className="flex items-center justify-between gap-4">
          <Link to="/" className="inline-flex items-center">
            <span className="font-extrabold text-2xl tracking-tight text-primary">GenPay</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/services">
              <Button variant="hero-outline" size="sm">Services</Button>
            </Link>
            <Link to="/login">
              <Button variant="hero" size="sm">Login</Button>
            </Link>
          </div>
        </div>

        <div className="mt-10 mx-auto max-w-6xl">
          <h1 className="text-4xl sm:text-5xl font-heading font-bold text-foreground">
            Blogs
          </h1>
          <p className="text-muted-foreground mt-3 max-w-2xl">
            Insights, tips, and explainers across payments, banking, lending, BBPS, and retail services.
          </p>

          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {BLOG_POSTS.map((post) => (
              <Link
                key={post.id}
                to={`/blogs/${post.id}`}
                className="group rounded-2xl border border-border bg-gradient-card shadow-elevated hover:shadow-lg transition-shadow overflow-hidden"
              >
                <img
                  src={post.img}
                  alt={post.title}
                  className="h-44 w-full object-cover"
                  loading="lazy"
                />
                <div className="p-6">
                  <div className="text-xs text-muted-foreground">{post.tag}</div>
                  <h2 className="mt-2 font-heading font-bold text-foreground text-lg leading-snug group-hover:underline">
                    {post.title}
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    {post.content?.[0] || "Read the full post for details."}
                  </p>
                  <div className="mt-4 text-xs text-muted-foreground">
                    {post.date} • {post.time} • {post.comments} comments
                  </div>
                  <div className="mt-4 text-sm font-medium text-primary opacity-80 group-hover:opacity-100">
                    Read more &gt;
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-10 flex gap-3">
            <Link to="/">
              <Button variant="hero-outline">Back to Home</Button>
            </Link>
            <Link to="/services">
              <Button variant="hero">Explore Services</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
