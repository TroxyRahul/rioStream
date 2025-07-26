import Scraper from "../lib/scrapper.js";

const scraper = new Scraper();

export const getAllShows = async (page) => {
    try {
        const shows = await scraper.scrapePopularShows(page);
        return shows;
    } catch (error) {;
        throw error;
    }
}

export const getShowById = async (id) => {
    try {
        const show = await scraper.scrapeShowById(id);
        return show;
    } catch (error) {
        throw error;
    }
}

export const getEpisodeById = async (id) => {
    try {
        const episode = await scraper.scrapeEpisodeById(id);
        return episode;
    } catch (error) {
        throw error;
    }
}

export const search = async (keyword) => {
    try {
        const shows = await scraper.scrapeSearch(keyword);
        return shows;
    } catch (error) {
        throw error;
    }
}