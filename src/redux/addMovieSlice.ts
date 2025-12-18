import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { supabase } from '../config/supabase';
import type { Database } from '../config/supabase';
import { showSuccessToast, showErrorToast } from '../utils/notifications';
import {
    KINOPOISK_API_KEY,
    KINOPOISK_API_URL,
    OPENSUBTITLES_API_KEY,
    OPENSUBTITLES_API_URL,
} from '../config/api';
import { SEARCH_RESULTS_LIMIT } from '../config/constants';

type Movie = Database['public']['Tables']['movies']['Row'];
type MovieInsert = Database['public']['Tables']['movies']['Insert'];
interface KinopoiskMovie {
    nameRu: string;
    nameEn: string;
    year: string;
    filmLength: string;
    description: string;
    countries: { country: string }[];
    genres: { genre: string }[];
    rating: string;
    ratingVoteCount: string;
    kinopoiskId?: number;
}
interface KinopoiskResponse { films: KinopoiskMovie[]; }

interface OpenSubtitlesSubtitleInfo {
    fileId: number;
    fileName: string;
    language: string;
    release: string;
}
interface SubtitlesResult extends OpenSubtitlesSubtitleInfo { content: string | null; }
interface DownloadResponse { link: string; }
interface OpenSubtitlesResponse {
    data: Array<{
        attributes: {
            language: string;
            files: Array<{ file_id: number, file_name: string }>;
            release: string;
            download_count: number;
        }
    }>;
    total_count: number;
}
interface AddMovieState {
    saving: boolean;
    isFetchingMetadata: boolean;
    isFetchingSubtitles: boolean;
    tempFormData: Partial<MovieInsert> | null;
    subtitlesInfo: { content: string; fileName: string; } | null;
    error: string | null;
    searchResults: KinopoiskMovie[];
    selectedMovie: KinopoiskMovie | null;
    searchSubtitlesByDefault: boolean;
}

async function searchSubtitles(movieTitle: string, movieYear: string): Promise<OpenSubtitlesSubtitleInfo | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
        const query = `${movieTitle} ${movieYear}`;
        const url = `${OPENSUBTITLES_API_URL}/subtitles?query=${encodeURIComponent(query)}&languages=ru`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Api-Key': OPENSUBTITLES_API_KEY,
                'Content-Type': 'application/json',
                'User-Agent': 'MyMovieApp v1.0'
            },
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) throw new Error(`OpenSubtitles API error: ${response.status}`);

        const data: OpenSubtitlesResponse = await response.json();

        if (data.data && data.data.length > 0 && data.data[0].attributes.files.length > 0) {
            const subtitle = data.data.sort((a, b) =>
                (b.attributes.download_count || 0) - (a.attributes.download_count || 0)
            )[0];
            const fileId = subtitle.attributes.files[0].file_id;
            const fileName = subtitle.attributes.files[0].file_name;
            return {
                fileId,
                fileName,
                language: subtitle.attributes.language,
                release: subtitle.attributes.release
            };
        }
        return null;
    } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            console.error('Поиск субтитров прерван по таймауту (10 секунд)');
        } else {
            console.error('Ошибка при поиске субтитров:', error);
        }
        return null;
    }
}

async function downloadSubtitles(fileId: number): Promise<string | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
        const url = `${OPENSUBTITLES_API_URL}/download`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Api-Key': OPENSUBTITLES_API_KEY,
                'Content-Type': 'application/json',
                'User-Agent': 'MyMovieApp v1.0'
            },
            body: JSON.stringify({ file_id: fileId }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) throw new Error(`Ошибка скачивания: ${response.status}`);

        const data: DownloadResponse = await response.json();

        if (data.link) {
            const downloadController = new AbortController();
            const downloadTimeoutId = setTimeout(() => downloadController.abort(), 10000);

            try {
                const downloadResponse = await fetch(data.link, {
                    signal: downloadController.signal
                });

                clearTimeout(downloadTimeoutId);

                if (!downloadResponse.ok) throw new Error(`Ошибка получения файла: ${downloadResponse.status}`);
                return await downloadResponse.text();
            } catch (downloadError: any) {
                clearTimeout(downloadTimeoutId);
                if (downloadError.name === 'AbortError') {
                    console.error('Скачивание субтитров прервано по таймауту (10 секунд)');
                } else {
                    console.error('Ошибка при скачивании файла:', downloadError);
                }
                return null;
            }
        }
        return null;
    } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            console.error('Запрос на скачивание субтитров прерван по таймауту (10 секунд)');
        } else {
            console.error('Ошибка при запросе скачивания субтитров:', error);
        }
        return null;
    }
}

async function findAndDownloadSubtitles(movieTitle: string, movieYear: string): Promise<SubtitlesResult | null> {
    if (!movieTitle || !movieYear) return null;

    try {
        const subtitleInfo = await searchSubtitles(movieTitle, movieYear);
        if (subtitleInfo) {
            const subtitleContent = await downloadSubtitles(subtitleInfo.fileId);
            return {
                ...subtitleInfo,
                content: subtitleContent,
                fileName: subtitleInfo.fileName
            };
        }
        return null;
    } catch (error) {
        return null;
    }
}
function parseKinopoiskMovie(movieData: KinopoiskMovie): Partial<MovieInsert> {
    const movieTitle = movieData.nameRu || movieData.nameEn || '';
    const movieYear = movieData.year || '';

    let durationInMinutes = 0;
    if (movieData.filmLength) {
        if (movieData.filmLength.includes(':')) {
            const [h, m] = movieData.filmLength.split(':').map(Number);
            durationInMinutes = h * 60 + m;
        } else if (movieData.filmLength.includes('ч')) {
            const hM = movieData.filmLength.match(/(\d+)\s*ч/);
            const mM = movieData.filmLength.match(/(\d+)\s*мин/);
            durationInMinutes = (hM ? parseInt(hM[1]) : 0) * 60 + (mM ? parseInt(mM[1]) : 0);
        } else {
            durationInMinutes = parseInt(movieData.filmLength) || 0;
        }
    }

    let description = movieData.description;
    if (!description || description.trim() === '') {
        const genreText = movieData.genres && movieData.genres.length > 0
            ? `Жанр: ${movieData.genres.map(g => g.genre).join(', ')}. `
            : '';
        const countryText = movieData.countries && movieData.countries.length > 0
            ? `Страна: ${movieData.countries.map(c => c.country).join(', ')}.`
            : '';
        description = `Фильм "${movieTitle}" ${movieYear ? `(${movieYear})` : ''}. ${genreText}${countryText}`;

        if (!description.trim()) {
            description = `Фильм "${movieTitle}"`;
        }
    }

    let rating: number = 0;
    if (movieData.rating && movieData.rating !== 'null' && movieData.rating !== '0') {
        rating = parseFloat(movieData.rating);
    } else if (movieData.ratingVoteCount && parseInt(movieData.ratingVoteCount) > 0) {
        rating = 0.1;
    }

    return {
        title: movieTitle,
        release_year: movieYear ? Number(movieYear) : undefined,
        duration_minutes: durationInMinutes > 0 ? durationInMinutes : undefined,
        description: description.trim(),
        rating: rating,
    };
}
export const searchMovies = createAsyncThunk<
    KinopoiskMovie[],
    string,
    { rejectValue: string }
>('addMovie/searchMovies', async (title, { rejectWithValue }) => {
    try {
        const API_URL = `${KINOPOISK_API_URL}?keyword=${encodeURIComponent(title)}`;
        const kpResponse = await fetch(API_URL, {
            method: 'GET',
            headers: {
                'X-API-KEY': KINOPOISK_API_KEY,
                'Content-Type': 'application/json',
            },
        });

        if (!kpResponse.ok) {
            throw new Error(`Ошибка Kinopoisk API: ${kpResponse.status} ${kpResponse.statusText}`);
        }

        const data: KinopoiskResponse = await kpResponse.json();
        if (!data.films || data.films.length === 0) {
            throw new Error(`Фильмы по запросу "${title}" не найдены`);
        }

        return data.films.slice(0, SEARCH_RESULTS_LIMIT);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка поиска';
        showErrorToast('Ошибка поиска', errorMessage);
        return rejectWithValue(errorMessage);
    }
});
export const selectMovie = createAsyncThunk<
    Partial<MovieInsert>,
    KinopoiskMovie,
    { rejectValue: string }
>('addMovie/selectMovie', async (movie, { rejectWithValue }) => {
    try {
        const movieInsertData = parseKinopoiskMovie(movie);
        const movieTitle = movie.nameRu || movie.nameEn || '';

        showSuccessToast('Успех', `Данные фильма "${movieTitle}" загружены.`);
        return movieInsertData;

    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка получения данных';
        showErrorToast('Ошибка получения информации', errorMessage);
        return rejectWithValue(errorMessage);
    }
});
export const fetchSubtitlesForSelectedMovie = createAsyncThunk<
    SubtitlesResult | null,
    void,
    { rejectValue: string, state: { addMovie: AddMovieState } }
>('addMovie/fetchSubtitlesForSelectedMovie', async (_, { rejectWithValue, getState }) => {
    try {
        const state = getState().addMovie;
        const movieTitle = state.tempFormData?.title || '';
        const movieYear = state.tempFormData?.release_year?.toString() || '';

        if (!movieTitle || !movieYear) {
            throw new Error('Не указаны название фильма или год выпуска');
        }

        const subtitlesResult = await findAndDownloadSubtitles(movieTitle, movieYear);

        if (subtitlesResult && subtitlesResult.content) {
            showSuccessToast('Успех', `Субтитры для "${movieTitle}" найдены и скачаны.`);
        } else {
            showErrorToast('Субтитры не найдены', `Для фильма "${movieTitle}" субтитры не найдены.`);
        }

        return subtitlesResult;

    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка поиска субтитров';
        showErrorToast('Ошибка поиска субтитров', errorMessage);
        return rejectWithValue(errorMessage);
    }
});
export const saveNewMovie = createAsyncThunk<
    Movie,
    { movieData: Partial<MovieInsert> },
    { rejectValue: string }
>('addMovie/saveNewMovie', async ({ movieData }, { rejectWithValue }) => {
    try {
        if (!movieData.title || !movieData.description || !movieData.rating) {
            throw new Error('Отсутствуют обязательные поля: Название, Описание или Рейтинг.');
        }

        const { data: supabaseData, error: supabaseError } = await supabase
            .from('movies')
            .insert([movieData as MovieInsert])
            .select()
            .single();

        if (supabaseError) {
            throw new Error(`Ошибка базы данных при добавлении: ${supabaseError.message}`);
        }

        showSuccessToast('Успех', `Фильм "${movieData.title}" успешно добавлен!`);
        return supabaseData!;

    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка сохранения';
        showErrorToast('Ошибка добавления', errorMessage);
        return rejectWithValue(errorMessage);
    }
});

const initialState: AddMovieState = {
    saving: false,
    isFetchingMetadata: false,
    isFetchingSubtitles: false,
    tempFormData: null,
    subtitlesInfo: null,
    error: null,
    searchResults: [],
    selectedMovie: null,
    searchSubtitlesByDefault: true,
};

const addMovieSlice = createSlice({
    name: 'addMovie',
    initialState,
    reducers: {
        clearAddMovieState: (state) => {
            state.saving = false;
            state.isFetchingMetadata = false;
            state.isFetchingSubtitles = false;
            state.tempFormData = null;
            state.subtitlesInfo = null;
            state.error = null;
            state.searchResults = [];
            state.selectedMovie = null;
        },
        updateTempFormData: (state, action: PayloadAction<Partial<MovieInsert>>) => {
            state.tempFormData = {
                ...state.tempFormData,
                ...action.payload,
            };
        },
        clearSearchResults: (state) => {
            state.searchResults = [];
            state.selectedMovie = null;
        },
        toggleSearchSubtitles: (state) => {
            state.searchSubtitlesByDefault = !state.searchSubtitlesByDefault;
        },
        setSearchSubtitles: (state, action: PayloadAction<boolean>) => {
            state.searchSubtitlesByDefault = action.payload;
        },
        clearSubtitlesInfo: (state) => {
            state.subtitlesInfo = null;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(searchMovies.pending, (state) => {
                state.isFetchingMetadata = true;
                state.error = null;
                state.searchResults = [];
                state.selectedMovie = null;
            })
            .addCase(searchMovies.fulfilled, (state, action) => {
                state.isFetchingMetadata = false;
                state.searchResults = action.payload;
            })
            .addCase(searchMovies.rejected, (state, action) => {
                state.isFetchingMetadata = false;
                state.error = action.payload as string;
                state.searchResults = [];
            });
        builder
            .addCase(selectMovie.pending, (state) => {
                state.isFetchingMetadata = true;
                state.error = null;
            })
            .addCase(selectMovie.fulfilled, (state, action) => {
                state.isFetchingMetadata = false;
                state.tempFormData = action.payload;
                state.selectedMovie = state.searchResults.find(
                    m => m.kinopoiskId === state.selectedMovie?.kinopoiskId
                ) || null;
            })
            .addCase(selectMovie.rejected, (state, action) => {
                state.isFetchingMetadata = false;
                state.error = action.payload as string;
            });
        builder
            .addCase(fetchSubtitlesForSelectedMovie.pending, (state) => {
                state.isFetchingSubtitles = true;
                state.error = null;
                state.subtitlesInfo = null;
            })
            .addCase(fetchSubtitlesForSelectedMovie.fulfilled, (state, action) => {
                state.isFetchingSubtitles = false;
                const subtitlesResult = action.payload;
                if (subtitlesResult && subtitlesResult.content) {
                    state.subtitlesInfo = {
                        content: subtitlesResult.content,
                        fileName: subtitlesResult.fileName
                    };
                }
            })
            .addCase(fetchSubtitlesForSelectedMovie.rejected, (state, action) => {
                state.isFetchingSubtitles = false;
                state.error = action.payload as string;
            });
        builder
            .addCase(saveNewMovie.pending, (state) => {
                state.saving = true;
                state.error = null;
            })
            .addCase(saveNewMovie.fulfilled, (state) => {
                state.saving = false;
                state.tempFormData = null;
                state.subtitlesInfo = null;
                state.searchResults = [];
                state.selectedMovie = null;
            })
            .addCase(saveNewMovie.rejected, (state, action) => {
                state.saving = false;
                state.error = action.payload as string;
            });
    },
});

export const {
    clearAddMovieState,
    updateTempFormData,
    clearSearchResults,
    toggleSearchSubtitles,
    setSearchSubtitles,
    clearSubtitlesInfo
} = addMovieSlice.actions;
export default addMovieSlice.reducer;