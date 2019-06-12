import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpHeaders } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class SpotifyApiService {

  constructor(private http: HttpClient) { }

  getUserInfo(token: string) {
    const httpOptions = {
      headers: new HttpHeaders({
        'Authorization': 'Bearer ' + token
      })
    };

    return this.http.get(
      'https://api.spotify.com/v1/me',
      httpOptions
    );
  }

  getPlaylists(params: string, token: string) {
    const httpOptions = {
      headers: new HttpHeaders({
        'Authorization': 'Bearer ' + token
      })
    };

    return this.http.get(
      'https://api.spotify.com/v1/me/playlists?' + params,
      httpOptions
    );
  }
  
  getPlaylistTracks(params: string, token: string, playlistId: string) {
    const httpOptions = {
      headers: new HttpHeaders({
        'Authorization': 'Bearer ' + token
      })
    };

		return this.http.get(
      'https://api.spotify.com/v1/playlists/' + playlistId + '/tracks?' + params, 
      httpOptions
    );
  }

  createPlaylist(token: string, userId: string, playlistName: string) {
    const httpOptions = {
      headers: new HttpHeaders({
        'Authorization': 'Bearer ' + token
      })
    };

    let payload = {
      name: playlistName
    };

		return this.http.post(
      'https://api.spotify.com/v1/users/' + userId + '/playlists',
      JSON.stringify(payload),
      httpOptions
    );
  }

  addSongsToPlaylist(token: string, playlistId: string, songs: any) {
    const httpOptions = {
      headers: new HttpHeaders({
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      })
    };

		return this.http.post(
      'https://api.spotify.com/v1/playlists/' + playlistId + '/tracks',
      JSON.stringify(songs),
      httpOptions
    );
  }
}
