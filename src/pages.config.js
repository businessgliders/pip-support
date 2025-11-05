import IntakeForm from './pages/IntakeForm';
import TicketBoard from './pages/TicketBoard';
import IntakeFormEmbed from './pages/IntakeFormEmbed';
import Layout from './Layout.jsx';


export const PAGES = {
    "IntakeForm": IntakeForm,
    "TicketBoard": TicketBoard,
    "IntakeFormEmbed": IntakeFormEmbed,
}

export const pagesConfig = {
    mainPage: "IntakeForm",
    Pages: PAGES,
    Layout: Layout,
};