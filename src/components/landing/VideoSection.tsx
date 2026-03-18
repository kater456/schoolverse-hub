import { useState } from "react";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VideoSectionProps {
  youtubeUrl?: string;
}

const VideoSection = ({ youtubeUrl }: VideoSectionProps) => {
  const [showVideo, setShowVideo] = useState(false);

  // Extract YouTube video ID from URL
  const getYouTubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const videoId = youtubeUrl ? getYouTubeId(youtubeUrl) : null;
  const hasVideo = !!videoId;

  return (
    <section className="py-20 bg-secondary/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-2 rounded-full bg-accent/10 text-accent font-semibold text-sm mb-4">
            See How It Works
          </span>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Watch Campus Market in Action
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Discover how school administrators use Campus Market to manage their marketplace,
            track orders, and serve their community.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-background aspect-video">
            {hasVideo && showVideo ? (
              <iframe
                src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
                title="Campus Market Demo Video"
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <>
                {/* Video thumbnail/placeholder */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 flex flex-col items-center justify-center">
                  {hasVideo ? (
                    <img
                      src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
                      alt="Video thumbnail"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center p-8">
                      <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                        <Play className="h-12 w-12 text-primary" />
                      </div>
                      <h3 className="text-xl font-semibold text-foreground mb-2">
                        Demo Video Coming Soon
                      </h3>
                      <p className="text-muted-foreground max-w-md">
                        We're working on an awesome walkthrough video. Check back soon!
                      </p>
                    </div>
                  )}
                  
                  {hasVideo && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Button
                        onClick={() => setShowVideo(true)}
                        variant="hero"
                        size="xl"
                        className="rounded-full w-20 h-20 p-0"
                      >
                        <Play className="h-8 w-8 ml-1" />
                      </Button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div className="p-4">
              <div className="text-3xl font-bold text-primary mb-2">500+</div>
              <div className="text-muted-foreground">Schools Trust Us</div>
            </div>
            <div className="p-4">
              <div className="text-3xl font-bold text-primary mb-2">$2M+</div>
              <div className="text-muted-foreground">Processed Monthly</div>
            </div>
            <div className="p-4">
              <div className="text-3xl font-bold text-primary mb-2">50K+</div>
              <div className="text-muted-foreground">Happy Students</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default VideoSection;
