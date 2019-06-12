import { Component, OnInit } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';
import { SpotifyApiService } from '../services/spotify-api.service';
import { LyricsApiService } from '../services/lyrics-api.service';
import { FormBuilder } from '@angular/forms';
import { Validators } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss']
})
export class MainComponent implements OnInit {
  
  spotifyToken: string;
  spotifyUserId: string;
  playlists: any = [];
  languageConfirm: boolean = false;
  formSubmitted: boolean = false;
  finalSongCount: number;
  activityLog: string;
  statuses = [
    {
      text: 'Getting playlist songs',
      status: 'waiting'
    },
    {
      text: 'Getting song lyrics',
      status: 'waiting'
    },
    {
      text: 'Checking lyrics',
      status: 'waiting'
    },
    {
      text: 'Adding songs to new playlist',
      status: 'waiting'
    }
  ];

  // form
  playlistForm = this.fb.group({
    sourcePlaylistId: ['', Validators.required],
    newPlaylistName: ['', Validators.required],
    languageFilter: ['']
  });

  constructor(
    private router: Router,
    private cookieService: CookieService,
    private spotifyAPI: SpotifyApiService,
    private lyricsAPI: LyricsApiService,
    private fb: FormBuilder
  ) {}

  ngOnInit() {
    // check for a token cookie
    this.spotifyToken = this.cookieService.get('spotifyAccessToken');

    // if doesn't exist or expired...
    if(!this.spotifyToken) {
      this.spotifyToken = window.location.href.split('&')[0].split('=')[1];

      // if nothing is found in the URL...
      if(!this.spotifyToken) {
        // authenticate with spotify
        window.location.href = 'https://accounts.spotify.com/authorize?client_id=1b65d7afe0e94690a089f847c13aedee&redirect_uri=http%3A%2F%2Flocalhost%3A4200%2Fapp&response_type=token&scope=playlist-read-private,playlist-modify-public,playlist-modify-private';
      } else {
        
        // refresh and remove params
        this.router.navigate(['/app']);

        // set cookie
        let oneHour = new Date(new Date().getTime() + 60 * 60 * 1000);
        this.cookieService.set('spotifyAccessToken', this.spotifyToken, oneHour);

        // get playlists
        this.getPlaylists('offset=0&limit=50');
        this.getUserInfo();
      }
    } else {
      // refresh and remove params
      this.router.navigate(['/app']);
      
      this.getPlaylists('offset=0&limit=50');
      this.getUserInfo();
      this.playlistForm.patchValue({
        languageFilter: 'ass, bitch, cunt, damn, dick, fuck, hell, shit, sex, god, goddamn, jesus, christ'
      });
    }
  }

  get playlistId() {
    return this.playlistForm.get('sourcePlaylistId');
  }

  get newPlaylistName() {
    return this.playlistForm.get('newPlaylistName');
  }

  toggle() {
    this.languageConfirm = !this.languageConfirm;
  }

  startOver() {
    window.location.href = '/app';
    // this.languageConfirm = false;
    // this.playlistForm.reset();
    // this.playlistForm.patchValue({
    //   languageFilter: 'ass, bitch, cunt, damn, dick, fuck, hell, shit, sex, god, goddamn, jesus, christ'
    // });
    
    // let form = document.querySelector('.playlist-selection');
    // form.className = '';
    // form.classList.add('playlist-selection');

    // let show = document.querySelector('.show');
    // show.className = '';
    // show.classList.add('collapse');

    // let status = document.querySelector('.status');
    // status.className = '';
    // status.classList.add('status', 'hidden');

    // let final = document.querySelector('.final');
    // final.className = '';
    // final.classList.add('final', 'hidden');
    
    // let error = document.querySelector('.error');
    // error.className = '';
    // error.classList.add('error', 'hidden');

    // this.toggle();
  }

  resetToDefaults() {
    this.playlistForm.patchValue({
      languageFilter: 'ass, bitch, cunt, damn, dick, fuck, hell, shit, sex, god, goddamn, jesus, christ'
    });
  }

  getUserInfo() {
    this.spotifyAPI.getUserInfo(this.spotifyToken)
      .subscribe(response => {
        this.spotifyUserId = response['id'];
      }
    );
  }

  getPlaylists = (params: string) => {
    this.spotifyAPI.getPlaylists(params, this.spotifyToken)
      .subscribe(response => {
        
        this.playlists = response['items'].filter(i => {
          if(i.tracks.total <= 900) {
            return i;
          }
        });

        if(response['next'] != null) {
          let params = response['next'].split('?')[1];
          this.getPlaylists(params);
        }
      });
  }

  onSubmit() {  
    let form = document.querySelector('.playlist-selection');
    form.classList.add('animated', 'faster', 'fadeOutUp');
    form.addEventListener('animationend', () => {
      form.classList.add('hidden');
      this.formSubmitted = true;
      
      let status = document.querySelector('.status');
      status.classList.remove('hidden');
      status.classList.add('animated', 'faster', 'fadeInDown');
      this.getPlaylistTracks();
    });
  }

  getPlaylistTracks() {
    let tracks: any;
    let playlistTracks: any = [];
    let playlistId: string = this.playlistForm.value.sourcePlaylistId;
    this.statuses[0].status = 'running';

    let loop = (params: string) => {
      this.spotifyAPI.getPlaylistTracks(params, this.spotifyToken, playlistId)
        .subscribe(response => {
          tracks = response;
          
          tracks.items.forEach(item => {
            if(!item.track.explicit) {

              let track = {
                artist: item.track.artists[0].name,
                title: item.track.name,
                id: item.track.id,
                uri: item.track.uri
              };

              playlistTracks.push(track);

              this.logActivity('Got info for ' + track.title + ' by ' + track.artist);
            }
          });

          if(tracks.next != null) {
            let params = tracks.next.split('?')[1];
            loop(params);
          } else {
            this.logActivity('Done getting songs from playlist...');
            this.statuses[0].status = 'finished';
            this.getLyrics(playlistTracks);
          }
        }
      );
    }

    loop('offset=0&limit=100');
  }

  getLyrics(tracks: any) {
    this.logActivity('Searching for matching songs in lyrics database...');

    this.statuses[1].status = 'running';

    let resolved = [];

    tracks.forEach((track, index) => {
      this.lyricsAPI.getSongLyricsURL(track)
        .subscribe(response => {
          resolved.push({
            track: track,
            response: response
          });

          if(resolved.length == tracks.length) {
            this.logActivity('Checking search results for matching song and artist information...');
            this.checkSearchResults(resolved);
          }
        }
      );
    });
  }

  checkSearchResults(resolved) {
    let songs: any = [];

    resolved.forEach(item => {
      let hits = item.response.response.hits;
      let track = item.track;

      for(let i = 0; i < hits.length; i++) {
        let hit = hits[i];
    
        if(hit.result.primary_artist.name.toLowerCase() == track.artist.toLowerCase()) {
          let songMatchesHitTitle = track.title.toLowerCase().indexOf(hit.result.title.toLowerCase() > -1) ? true : false;
          let hitTitleMatchesSong = hit.result.title.toLowerCase().indexOf(track.title.toLowerCase() > -1) ? true : false;
    
          if(songMatchesHitTitle || hitTitleMatchesSong) {
            track.lyrics_url = hit.result.url;
            songs.push(track);
            this.logActivity('Found match for ' + track.title + ' by ' + track.artist);
            return;
          }
        }
      }
    
      /*
       *  No match so as a last ditch effort we're going to 
       *  guess the URL to the lyrics and add it to the results
       *
      */

      let url = 'https://genius.com/';
      let temp = track.artist + ' ' + track.title + ' lyrics';
      
      // replace ampersand with 'and'
      // remove non alphanumeric characters
      // replace spaces with dashes
      // convert to lower case
      temp = temp
        .replace(/&/, 'and')
        .replace(/[^\w\s]/gi, '')
        .replace(/\s+/g, '-')
        .toLowerCase(); 
      
      // capitalize first letter
      // add to track object
      track.lyrics_url = url += temp.charAt(0).toUpperCase() + temp.slice(1);

      songs.push(track);
    });

    this.logActivity('Getting lyrics from the database...');
    this.scrapeLyricsPages(songs);
  }

  scrapeLyricsPages(songs: any) {

    let resolved = [];

    songs.forEach(song => {
      this.lyricsAPI.getLyrics(song.lyrics_url)
        .subscribe(response => {
          resolved.push(response);
          song.lyrics = response;
          this.logActivity('Got lyrics for ' + song.title + ' by ' + song.artist);

          if(resolved.length == songs.length) {
            this.statuses[1].status = 'finished';
            this.logActivity('Checking lyrics for language...');
            this.checkLyrics(songs);
          }
        }
      );
    });
  }

  checkLyrics(songs) {
    this.statuses[2].status = 'running';
    let clean = [];

    let languageFilterValues = this.playlistForm.get('languageFilter').value.split(',').map(s => { return '\\b' + s.trim(); });
    languageFilterValues = new RegExp(languageFilterValues.join('|'), 'gmi');

    songs.forEach((song) => {

      if(song.lyrics != null) {
        //var match = song.lyrics.match(/\bass|\bbitch|\bcunt|\bdamn|\bdick|\bfuck|\bhell|\bshit|\bsex|\bgod|\bgoddamn|\bjesus|\bchrist/gmi);
        var match = song.lyrics.match(languageFilterValues);

        if(match) {
          this.logActivity('Language found in ' + song.title + ' by ' + song.artist + ', skipping...');
        } else {
          clean.push(song);
          this.logActivity(song.title + ' by ' + song.artist + ' is clean. Adding to final list of songs for playlist...');
        }
      }
    });

    this.statuses[2].status = 'finished';
    if(clean.length) {
      this.addSongsToPlaylist(clean);
    } else {
      this.noCleanSongs();
    }
  }

  addSongsToPlaylist(songs) {
    this.finalSongCount = songs.length;
    this.statuses[3].status = 'running';
    // create playlist
    let newPlaylistName = this.playlistForm.get('newPlaylistName').value;
    this.spotifyAPI.createPlaylist(this.spotifyToken, this.spotifyUserId, newPlaylistName)
      .subscribe(response => {
        
        this.logActivity('Creating new playlist "' + newPlaylistName + '"');
        this.logActivity('Adding songs to ' + newPlaylistName + '...');

        let playlistId = response['id'];
        let resolved   = [];
        let numLoops   = Math.ceil(songs.length / 100);

        // add songs to playlist
        let loop = () => {
          
          let batch      = songs.splice(0, 100);
          let songsToAdd = {
            uris: []
          };

          songsToAdd.uris = batch.map(song => {
            return song.uri;
          });

          this.spotifyAPI.addSongsToPlaylist(this.spotifyToken, playlistId, songsToAdd)
            .subscribe(response => {
              resolved.push(response);
              
              if(songs.length) {
                loop();
              }

              if(resolved.length == numLoops) {
                this.statuses[3].status = 'finished';
                this.logActivity('All done.');

                let status = document.querySelector('.status');
                status.classList.add('fadeOutUp');
                status.addEventListener('animationend', () => {
                  status.classList.add('hidden');
                  
                  let final = document.querySelector('.final');
                  final.classList.remove('hidden');
                  final.classList.add('animated', 'faster', 'fadeInDown');
                });
              }
            }
          )
        }

        loop();
      }
    );
  }

  noCleanSongs() {
    let status = document.querySelector('.status');
    status.classList.add('fadeOutUp');
    status.addEventListener('animationend', () => {
      status.classList.add('hidden');
      
      let error = document.querySelector('.error');
      error.classList.remove('hidden');
      error.classList.add('animated', 'faster', 'fadeInDown');
    });
  }

  logActivity(logText) {
    let log     = document.querySelector('.activity-log');
    let logItem = document.createElement('div');
    
    logItem.innerText = logText;
    log.append(logItem);
    
    // auto scroll to bottom
    log.scrollTop = log.scrollHeight;
  }

}
