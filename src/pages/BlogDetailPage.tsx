import { Link, Navigate, useParams } from "react-router-dom";
import { BLOG_POSTS, getBlogPost, getRelatedBlogPosts } from "@/data/blogs";
import { Button } from "@/components/ui/button";
import usePageTitle from "@/hooks/usePageTitle";

export default function BlogDetailPage() {
  const { blogId } = useParams();
  const post = blogId ? getBlogPost(blogId) : null;

  if (!post) return <Navigate to="/blogs" replace />;

  usePageTitle(`GenPay | ${post.title}`);

  const related = getRelatedBlogPosts(post);

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="container mx-auto px-4 pt-28 pb-16">
        <div className="flex items-center justify-between gap-4">
          <Link to="/" className="inline-flex items-center">
            <span className="font-extrabold text-2xl tracking-tight text-primary">GenPay</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/blogs">
              <Button variant="hero-outline" size="sm">Blogs</Button>
            </Link>
            <Link to="/login">
              <Button variant="hero" size="sm">Login</Button>
            </Link>
          </div>
        </div>

        <div className="mt-10 mx-auto max-w-6xl">
          <Link to="/blogs" className="text-sm text-muted-foreground hover:text-foreground">
            &lt;- Back to Blogs
          </Link>

          <div className="mt-6 rounded-2xl border border-border bg-gradient-card shadow-elevated overflow-hidden">
            <div className="relative">
              <img src={post.img} alt={post.title} className="w-full h-64 sm:h-80 object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/25 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
                <div className="inline-flex items-center rounded-full bg-white/10 border border-white/20 px-3 py-1 text-xs text-white">
                  {post.tag}
                </div>
                <h1 className="mt-3 text-2xl sm:text-4xl font-heading font-bold text-white leading-tight">
                  {post.title}
                </h1>
                <div className="mt-3 text-sm text-white/80">
                  {post.author} • {post.date} • {post.time} • {post.comments} comments
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-10">
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                {post.content.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </div>

              <div className="mt-10 grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-border bg-secondary/10 p-6">
                  <div className="font-heading font-bold text-foreground">Why choose this</div>
                  <ul className="mt-3 list-disc pl-5 space-y-2 text-sm text-muted-foreground">
                    {post.whyChoose.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-2xl border border-border bg-secondary/10 p-6">
                  <div className="font-heading font-bold text-foreground">Highlights</div>
                  <div className="mt-4 grid sm:grid-cols-3 gap-3">
                    {post.highlights.map((h) => (
                      <div key={h.title} className="rounded-xl border border-border bg-background/40 p-4">
                        <div className="text-sm font-heading font-bold text-foreground">{h.title}</div>
                        <div className="text-xs text-muted-foreground mt-1">{h.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {related.length ? (
                <div className="mt-10">
                  <div className="font-heading font-bold text-foreground text-xl">Related posts</div>
                  <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {related.map((r) => (
                      <Link
                        key={r.id}
                        to={`/blogs/${r.id}`}
                        className="group rounded-2xl border border-border bg-background/40 hover:bg-background/60 transition-colors overflow-hidden"
                      >
                        <img src={r.img} alt={r.title} className="h-36 w-full object-cover" />
                        <div className="p-4">
                          <div className="text-xs text-muted-foreground">{r.tag}</div>
                          <div className="mt-1 font-heading font-bold text-foreground group-hover:underline">
                            {r.title}
                          </div>
                          <div className="mt-2 text-xs text-muted-foreground">
                            {r.date} • {r.time}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="mt-10 flex flex-col sm:flex-row gap-3">
                <Link to="/services">
                  <Button variant="hero-outline">Explore Services</Button>
                </Link>
                <Button asChild variant="hero">
                  <a href="/#contact">Contact Us</a>
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-10 text-xs text-muted-foreground">
            Showing {BLOG_POSTS.length} posts.
          </div>
        </div>
      </div>
    </div>
  );
}

