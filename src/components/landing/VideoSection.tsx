import { useState } from "react";
import { Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import explainerVideo from "@/assets/edumarket-explainer.mp4";

const VideoSection = () => {
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlayVideo = () => {
    const video = document.getElementById("explainer-video") as HTMLVideoElement;
    if (video) {
      if (isPlaying) {
        video.pause();
      } else {
        video.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <section className="py-20 bg-secondary/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-2 rounded-full bg-accent/10 text-accent font-semibold text-sm mb-4">
            See How It Works
          </span>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Watch EduMarket in Action
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Discover how school administrators use EduMarket to manage their marketplace,
            track orders, and serve their community.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-background">
            <video
              id="explainer-video"
              src={explainerVideo}
              className="w-full aspect-video"
              poster=""
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
              controls
            />
            
            {!isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center bg-primary/10">
                <Button
                  onClick={handlePlayVideo}
                  variant="hero"
                  size="xl"
                  className="rounded-full w-20 h-20 p-0"
                >
                  <Play className="h-8 w-8 ml-1" />
                </Button>
              </div>
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
