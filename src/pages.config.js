import Home from './pages/Home';
import IntakeForm from './pages/IntakeForm';
import IntakeFormEmbed from './pages/IntakeFormEmbed';
import TicketBoard from './pages/TicketBoard';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "IntakeForm": IntakeForm,
    "IntakeFormEmbed": IntakeFormEmbed,
    "TicketBoard": TicketBoard,
}

export const pagesConfig = {
    mainPage: "IntakeForm",
    Pages: PAGES,
    Layout: __Layout,
};