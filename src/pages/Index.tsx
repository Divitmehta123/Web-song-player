"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as JSZip from 'jszip';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Pause, SkipForward, SkipBack, Music, Upload, Loader2 } from 'lucide-react';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { cn } from '@/lib/utils';

type Track = {
  name: string;
  url: string;
};

type Playlist = {
  name: string;
  tracks: Track[];
};

const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const MusicPlayerPage = () => {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [currentPlaylistIndex, setCurrentPlaylistIndex] = useState<number | null>(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const playlistsRef = useRef(playlists);
  playlistsRef.current = playlists;

  useEffect(() => {
    return () => {
      playlistsRef.current.forEach(playlist => {
        playlist.tracks.forEach(track => URL.revokeObjectURL(track.url));
      });
    };
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);

    try {
      const zip = await JSZip.loadAsync(file);
      const audioFiles: Track[] = [];
      const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.flac'];

      const promises = Object.keys(zip.files).map(async (filename) => {
        const zipEntry = zip.files[filename];
        if (!zipEntry.dir && audioExtensions.some(ext => filename.toLowerCase().endsWith(ext))) {
          const blob = await zipEntry.async('blob');
          const url = URL.createObjectURL(blob);
          audioFiles.push({ name: filename.split('/').pop() || filename, url });
        }
      });

      await Promise.all(promises);

      if (audioFiles.length > 0) {
        const newPlaylist: Playlist = {
          name: file.name,
          tracks: audioFiles.sort((a, b) => a.name.localeCompare(b.name)),
        };
        setPlaylists(prev => {
          const updatedPlaylists = [...prev, newPlaylist];
          if (currentPlaylistIndex === null) {
            setCurrentPlaylistIndex(0);
            setCurrentTrackIndex(0);
          }
          return updatedPlaylists;
        });
      }
    } catch (error) {
      console.error("Error processing zip file:", error);
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const currentPlaylist = currentPlaylistIndex !== null ? playlists[currentPlaylistIndex] : null;
  const currentTrack = currentPlaylist && currentTrackIndex !== null ? currentPlaylist.tracks[currentTrackIndex] : null;

  const playNext = useCallback(() => {
    if (!currentPlaylist) return;
    setCurrentTrackIndex(prevIndex => {
      if (prevIndex === null || prevIndex === currentPlaylist.tracks.length - 1) {
        return 0;
      }
      return prevIndex + 1;
    });
    setIsPlaying(true);
  }, [currentPlaylist]);

  const playPrevious = () => {
    if (!currentPlaylist) return;
    setCurrentTrackIndex(prevIndex => {
      if (prevIndex === null || prevIndex === 0) {
        return currentPlaylist.tracks.length - 1;
      }
      return prevIndex - 1;
    });
    setIsPlaying(true);
  };

  const togglePlayPause = () => {
    if (currentTrackIndex === null) return;
    setIsPlaying(!isPlaying);
  };
  
  const selectTrack = (index: number) => {
    setCurrentTrackIndex(index);
    setIsPlaying(true);
  };

  const handlePlaylistChange = (indexStr: string) => {
    const index = parseInt(indexStr, 10);
    if (index !== currentPlaylistIndex) {
      setCurrentPlaylistIndex(index);
      setCurrentTrackIndex(0);
      setIsPlaying(true);
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.play().catch(e => console.error("Playback error:", e));
    } else {
      audio.pause();
    }
  }, [isPlaying, currentTrack]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio && currentTrack) {
      audio.src = currentTrack.url;
      if (isPlaying) {
        audio.play().catch(e => console.error("Playback error:", e));
      }
    }
  }, [currentTrack]);
  
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      if (audio.duration > 0) {
        setProgress((audio.currentTime / audio.duration) * 100);
        setCurrentTime(audio.currentTime);
      }
    };
    const setAudioDuration = () => setDuration(audio.duration);
    const handleEnded = () => playNext();

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', setAudioDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('loadedmetadata', setAudioDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [playNext]);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="w-6 h-6" />
            Minimalist Music Player
          </CardTitle>
          <CardDescription>Upload .zip files of your songs to build playlists.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-6">
            <Input
              type="file"
              accept=".zip"
              onChange={handleFileUpload}
              ref={fileInputRef}
              className="hidden"
            />
            <Button onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              {isLoading ? 'Processing...' : (playlists.length > 0 ? 'Add Another Zip' : 'Upload Zip File')}
            </Button>

            {playlists.length > 1 && currentPlaylistIndex !== null && (
              <Select onValueChange={handlePlaylistChange} value={currentPlaylistIndex.toString()}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a playlist" />
                </SelectTrigger>
                <SelectContent>
                  {playlists.map((playlist, index) => (
                    <SelectItem key={index} value={index.toString()}>
                      {playlist.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {currentPlaylist && currentTrack ? (
              <div className="flex flex-col gap-4 items-center">
                <div className="text-center">
                  <p className="font-semibold text-lg truncate max-w-[300px]">{currentTrack.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Track {currentTrackIndex! + 1} of {currentPlaylist.tracks.length}
                  </p>
                </div>

                <div className="w-full">
                  <Progress value={progress} className="w-full" />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <Button variant="ghost" size="icon" onClick={playPrevious}><SkipBack className="w-6 h-6" /></Button>
                  <Button variant="default" size="icon" className="w-16 h-16 rounded-full" onClick={togglePlayPause}>
                    {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8" />}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={playNext}><SkipForward className="w-6 h-6" /></Button>
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <p>Your playlist will appear here.</p>
              </div>
            )}

            {currentPlaylist && (
              <div className="flex flex-col gap-2">
                <h3 className="font-semibold">Playlist: {currentPlaylist.name}</h3>
                <ScrollArea className="h-48 w-full rounded-md border">
                  <div className="p-2">
                    {currentPlaylist.tracks.map((track, index) => (
                      <div
                        key={index}
                        onClick={() => selectTrack(index)}
                        className={cn(
                          "p-2 rounded-md cursor-pointer hover:bg-accent flex items-center gap-2",
                          index === currentTrackIndex && "bg-accent text-accent-foreground"
                        )}
                      >
                        {index === currentTrackIndex && isPlaying && <Play className="w-4 h-4" />}
                        {index === currentTrackIndex && !isPlaying && <Pause className="w-4 h-4" />}
                        {index !== currentTrackIndex && <Music className="w-4 h-4" />}
                        <span className="truncate">{track.name}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      <audio ref={audioRef} />
      <div className="absolute bottom-0 right-0 p-4">
        <MadeWithDyad />
      </div>
    </div>
  );
};

export default MusicPlayerPage;