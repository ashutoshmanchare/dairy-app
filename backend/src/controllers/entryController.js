import { Entry } from "../models/Entry.js";

export const getEntries = async (req, res) => {
  try {
    const entries = await Entry.find({ user: req.userId }).sort({ createdAt: -1 });
    return res.status(200).json(entries);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch entries" });
  }
};

export const getEntryById = async (req, res) => {
  try {
    const entry = await Entry.findOne({ _id: req.params.id, user: req.userId });
    if (!entry) {
      return res.status(404).json({ message: "Entry not found" });
    }
    return res.status(200).json(entry);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch entry" });
  }
};

export const createEntry = async (req, res) => {
  try {
    const { title, content, entryDate, mood, tags } = req.body;
    if (!title || !content || !entryDate) {
      return res.status(400).json({ message: "Title, description and date are required" });
    }

    const entry = await Entry.create({
      user: req.userId,
      title,
      content,
      entryDate,
      mood,
      tags: Array.isArray(tags) ? tags : []
    });

    return res.status(201).json(entry);
  } catch (error) {
    return res.status(500).json({ message: "Failed to create entry" });
  }
};

export const updateEntry = async (req, res) => {
  try {
    const { title, content, entryDate, mood, tags } = req.body;

    const entry = await Entry.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { title, content, entryDate, mood, tags: Array.isArray(tags) ? tags : [] },
      { new: true, runValidators: true }
    );

    if (!entry) {
      return res.status(404).json({ message: "Entry not found" });
    }

    return res.status(200).json(entry);
  } catch (error) {
    return res.status(500).json({ message: "Failed to update entry" });
  }
};

export const deleteEntry = async (req, res) => {
  try {
    const entry = await Entry.findOneAndDelete({
      _id: req.params.id,
      user: req.userId
    });

    if (!entry) {
      return res.status(404).json({ message: "Entry not found" });
    }

    return res.status(200).json({ message: "Entry deleted" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete entry" });
  }
};
